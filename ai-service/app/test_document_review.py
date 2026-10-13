import base64
import json
import unittest
from unittest.mock import AsyncMock, patch

import pymupdf

from .document_review import _assess, _extract_pdf_pages, verify_documents
from .nvidia_client import NvidiaUnavailable, _extract_json
from .schemas import DocInput, DocVerificationRequest


class DocumentReviewTests(unittest.IsolatedAsyncioTestCase):
    def test_parses_vision_json_with_a_trailing_marker_or_duplicate(self):
        self.assertEqual(_extract_json('{"readable": true}\n</answer>\n{"readable": true}'), {'readable': True})

    def setUp(self):
        with pymupdf.open() as pdf:
            pdf.new_page().insert_text((50, 50), 'Test Applicant net monthly pay INR 30000')
            content = pdf.tobytes()
        self.doc = DocInput(id='income-1', type='INCOME_PROOF', originalName='payslip.pdf',
                            mimeType='application/pdf', contentBase64=base64.b64encode(content).decode())
        self.applicant = {'fullName': 'Test Applicant', 'monthlyIncome': 30000, 'currentAddress': 'Test Address'}

    def test_extracts_pdf_text_and_rejects_images_and_blank_pages(self):
        self.assertIn('Test Applicant net monthly pay INR 30000', _extract_pdf_pages(self.doc)[0][1])
        with self.assertRaises(ValueError):
            _extract_pdf_pages(self.doc.model_copy(update={'mimeType': 'image/png'}))
        with pymupdf.open() as pdf:
            pdf.new_page()
            blank = self.doc.model_copy(update={'contentBase64': base64.b64encode(pdf.tobytes()).decode()})
        with self.assertRaises(ValueError):
            _extract_pdf_pages(blank)

    async def test_scanned_pdf_is_ocrd_then_reviewed_as_text(self):
        with pymupdf.open() as pdf:
            page = pdf.new_page()
            pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 100, 100), False)
            pix.clear_with(255)
            page.insert_image(page.rect, pixmap=pix)
            scanned = self.doc.model_copy(update={'contentBase64': base64.b64encode(pdf.tobytes()).decode()})
        self.assertTrue(_extract_pdf_pages(scanned)[0][2].startswith('data:image/jpeg;base64,'))
        with patch('app.document_review.chat_json', new_callable=AsyncMock) as chat:
            chat.side_effect = [
                {'text': 'Test Applicant net monthly pay INR 30000'},
                {'readable': True, 'matchesType': False, 'nameMatches': True,
                 'reason': 'Unrelated content', 'evidence': 'Test Applicant'},
            ]
            result = await verify_documents(DocVerificationRequest(
                applicant=self.applicant, documents=[scanned], requiredDocuments=['INCOME_PROOF']))
        self.assertEqual(result.overallStatus, 'INCONSISTENT')
        self.assertEqual(chat.call_count, 2)
        self.assertEqual(chat.call_args_list[0].args[1][1]['type'], 'image_url')
        review_input = json.loads(chat.call_args_list[1].args[1])
        self.assertIn('Test Applicant net monthly pay INR 30000', review_input['extractedPdfText'])

    def test_unrelated_content_never_verified_even_with_a_proof_filename(self):
        result = _assess({'readable': True, 'matchesType': False, 'matchesApplicant': False,
                          'reason': 'Unrelated image', 'extractedFields': {}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'INCONSISTENT')

    def test_model_cannot_mark_missing_evidence_verified(self):
        result = _assess({'readable': True, 'matchesType': True, 'matchesApplicant': True,
                          'extractedFields': {}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'PENDING')

    def test_income_mismatch_is_flagged_even_if_model_claims_consistency(self):
        result = _assess({'readable': True, 'matchesType': True, 'matchesApplicant': True,
                          'evidence': 'Test Applicant net monthly pay INR 10000',
                          'extractedFields': {'fullName': 'Test Applicant', 'monthlyIncome': 10000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'INCONSISTENT')

    def test_matching_income_proof_with_visible_evidence_passes(self):
        result = _assess({'readable': True, 'matchesType': True, 'matchesApplicant': True,
                          'evidence': 'Test Applicant net monthly pay INR 30000',
                          'extractedFields': {'fullName': 'Test Applicant', 'monthlyIncome': 30000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'VERIFIED')

    def test_model_cannot_verify_a_name_missing_from_pdf_text(self):
        result = _assess({'readable': True, 'matchesType': True, 'nameMatches': True,
                          'evidence': 'Someone Else net monthly pay INR 30000',
                          'extractedFields': {'fullName': 'Someone Else', 'monthlyIncome': 30000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}},
                         self.doc, self.applicant, 'Someone Else net monthly pay INR 30000')
        self.assertEqual(result['status'], 'INCONSISTENT')

    def test_model_cannot_verify_evidence_absent_from_pdf_text(self):
        result = _assess({'readable': True, 'matchesType': True, 'nameMatches': True,
                          'evidence': 'Test Applicant net monthly pay INR 30000',
                          'extractedFields': {'fullName': 'Test Applicant', 'monthlyIncome': 30000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}},
                         self.doc, self.applicant, 'Test Applicant employment certificate')
        self.assertEqual(result['status'], 'PENDING')

    def test_income_proof_does_not_require_an_address(self):
        result = _assess({'readable': True, 'matchesType': True, 'nameMatches': True,
                          'addressMatches': False, 'evidence': 'Test Applicant monthly INR 30000',
                          'extractedFields': {'fullName': 'Test Applicant', 'monthlyIncome': 30000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'VERIFIED')

    async def test_sends_extracted_pdf_text_to_language_model(self):
        with patch('app.document_review.chat_json', new_callable=AsyncMock) as chat:
            chat.return_value = {'readable': True, 'matchesType': False, 'matchesApplicant': False,
                                 'reason': 'Not a payslip', 'evidence': 'Test Applicant net monthly pay INR 30000'}
            result = await verify_documents(DocVerificationRequest(applicant=self.applicant, documents=[self.doc], requiredDocuments=['INCOME_PROOF']))
        self.assertEqual(result.overallStatus, 'INCONSISTENT')
        self.assertEqual(result.consistencyScore, 0)
        content = json.loads(chat.call_args.args[1])
        self.assertIn('Test Applicant net monthly pay INR 30000', content['extractedPdfText'])
        self.assertNotIn('model', chat.call_args.kwargs)

    async def test_outage_is_pending_and_earns_zero_proof_credit(self):
        with patch('app.document_review.chat_json', new_callable=AsyncMock, side_effect=NvidiaUnavailable('offline')):
            result = await verify_documents(DocVerificationRequest(applicant=self.applicant, documents=[self.doc], requiredDocuments=['INCOME_PROOF']))
        self.assertEqual(result.overallStatus, 'PENDING')
        self.assertEqual(result.consistencyScore, 0)
        self.assertEqual(result.documentResults[0]['status'], 'PENDING')

    async def test_filename_only_request_never_passes(self):
        doc = self.doc.model_copy(update={'contentBase64': None})
        with patch('app.document_review.chat_json', new_callable=AsyncMock) as chat:
            result = await verify_documents(DocVerificationRequest(applicant=self.applicant, documents=[doc], requiredDocuments=['INCOME_PROOF']))
            chat.assert_not_called()
        self.assertEqual(result.overallStatus, 'UNREADABLE')
        self.assertEqual(result.consistencyScore, 0)
