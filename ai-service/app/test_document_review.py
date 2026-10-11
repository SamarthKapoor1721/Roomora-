import base64
import io
import unittest
from unittest.mock import AsyncMock, patch

from PIL import Image
import pymupdf

from .document_review import _assess, _pages, verify_documents
from .nvidia_client import NvidiaUnavailable, _extract_json
from .schemas import DocInput, DocVerificationRequest


class DocumentReviewTests(unittest.IsolatedAsyncioTestCase):
    def test_parses_vision_json_with_a_trailing_marker_or_duplicate(self):
        self.assertEqual(_extract_json('{"readable": true}\n</answer>\n{"readable": true}'), {'readable': True})

    def setUp(self):
        buffer = io.BytesIO()
        Image.new('RGB', (64, 64), 'green').save(buffer, format='PNG')
        self.doc = DocInput(id='income-1', type='INCOME_PROOF', originalName='payslip.png',
                            mimeType='image/png', contentBase64=base64.b64encode(buffer.getvalue()).decode())
        self.applicant = {'fullName': 'Test Applicant', 'monthlyIncome': 30000, 'currentAddress': 'Test Address'}

    def test_reads_image_bytes_and_renders_pdf_pages(self):
        self.assertTrue(_pages(self.doc)[0].startswith('data:image/jpeg;base64,'))
        with pymupdf.open() as pdf:
            pdf.new_page().insert_text((50, 50), 'Income proof')
            doc = self.doc.model_copy(update={'mimeType': 'application/pdf', 'contentBase64': base64.b64encode(pdf.tobytes()).decode()})
        self.assertEqual(len(_pages(doc)), 1)

    def test_wrong_image_never_verified_even_with_a_proof_filename(self):
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

    def test_income_proof_does_not_require_an_address(self):
        result = _assess({'readable': True, 'matchesType': True, 'nameMatches': True,
                          'addressMatches': False, 'evidence': 'Test Applicant monthly INR 30000',
                          'extractedFields': {'fullName': 'Test Applicant', 'monthlyIncome': 30000,
                                              'currency': 'INR', 'incomePeriod': 'monthly'}}, self.doc, self.applicant)
        self.assertEqual(result['status'], 'VERIFIED')

    async def test_sends_actual_image_to_vision_model(self):
        with patch('app.document_review.chat_json', new_callable=AsyncMock) as chat:
            chat.return_value = {'readable': True, 'matchesType': False, 'matchesApplicant': False,
                                 'reason': 'Plain green image is not income proof', 'evidence': 'No document text'}
            result = await verify_documents(DocVerificationRequest(applicant=self.applicant, documents=[self.doc], requiredDocuments=['INCOME_PROOF']))
        self.assertEqual(result.overallStatus, 'INCONSISTENT')
        self.assertEqual(result.consistencyScore, 0)
        content = chat.call_args.args[1]
        self.assertEqual(content[1]['type'], 'image_url')
        self.assertTrue(content[1]['image_url']['url'].startswith('data:image/jpeg;base64,'))

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
