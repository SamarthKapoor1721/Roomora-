import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, apiErrorMessage, openPrivateFile } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, ErrorBanner, Spinner, date } from '../../components/ui';

const STEPS = ['Applied', 'Documents', 'AI screening', 'Owner review', 'Decision'];
function stepReached(i: number, status: string): 'done' | 'current' | 'todo' {
  const reached = [
    true,
    ['SUBMITTED', 'DOCS_PENDING', 'UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['APPROVED', 'REJECTED'].includes(status),
  ];
  if (reached[i] && (i === 4 || !reached[i + 1])) return 'current';
  return reached[i] ? 'done' : 'todo';
}

const DOC_TYPES = ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF', 'EMPLOYMENT_LETTER', 'BANK_STATEMENT', 'PHOTO', 'OTHER'];
const REQUIRED = ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF'];
const REQUIRED_DETAILS = [
  { type: 'ID_PROOF', label: 'Identity proof', detail: 'Passport, driving licence or government ID', number: '01' },
  { type: 'ADDRESS_PROOF', label: 'Address proof', detail: 'Utility bill, bank statement or rental agreement', number: '02' },
  { type: 'INCOME_PROOF', label: 'Income proof', detail: 'Payslip, tax return or proof of employment', number: '03' },
];
type ApplicationDocument = { id: string; type: string; originalName: string; path: string; mimeType: string; verification: string; extractedData?: { reviewReason?: string } };

export default function TenantApplicationDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('ID_PROOF');
  const [selectedFile, setSelectedFile] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'application', id],
    queryFn: async () => (await api.get(`/tenant/applications/${id}`)).data.data,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.status === 'UNDER_AI_REVIEW' ? 5_000 : false,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Choose a file first');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', docType);
      return (await api.post(`/tenant/applications/${id}/documents`, fd)).data;
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      setSelectedFile('');
      qc.invalidateQueries({ queryKey: ['tenant', 'application', id] });
    },
  });
  const removeDoc = useMutation({
    mutationFn: async (docId: string) => (await api.delete(`/tenant/applications/${id}/documents/${docId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });
  const submit = useMutation({
    mutationFn: async () => (await api.post(`/tenant/applications/${id}/submit`)).data,
    // Screening may continue on the server after the HTTP request times out.
    onSettled: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });
  const withdraw = useMutation({
    mutationFn: async () => (await api.post(`/tenant/applications/${id}/withdraw`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });

  if (isLoading) return <Spinner label="Loading application…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;
  if (!data) return null;

  const provided: string[] = data.documents.filter((d: ApplicationDocument) => d.mimeType === 'application/pdf').map((d: ApplicationDocument) => d.type);
  const missing = REQUIRED.filter((r) => !provided.includes(r));
  const canEdit = ['DOCS_PENDING', 'SUBMITTED'].includes(data.status);
  const elig = data.eligibility;
  const docv = data.docVerification;
  const documents: ApplicationDocument[] = data.documents;
  const statusLabel = data.status.replaceAll('_', ' ').toLowerCase();
  const currentStep = STEPS.findIndex((_, i) => stepReached(i, data.status) === 'current');
  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-[1400px] pb-12">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm text-ink-400">
        <Link to="/tenant/applications" className="transition-colors hover:text-brand-700">My applications</Link>
        <Icon name="chevronRight" size={14} />
        <span className="font-medium text-ink-700">Application details</span>
      </nav>

      <header className="relative overflow-hidden rounded-[28px] bg-[#203d2c] px-6 py-7 text-white shadow-[0_18px_45px_-28px_rgba(30,55,38,.75)] sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c7ddbd]">Rental application</span>
              <span className="h-1 w-1 rounded-full bg-[#b7d89a]" />
              <span className="text-xs text-white/65">Applied {date(data.createdAt)}</span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
              {data.room.property.name}
            </h1>
            <p className="mt-2 text-base text-white/70">{data.room.name} <span className="mx-2 text-white/30">/</span> Your application journey</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#b8df8c]" />
              {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#c7ddbd]">{canEdit ? 'Your next step' : 'Application progress'}</p>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight">{canEdit ? (missing.length ? 'Complete your documents' : 'Ready for screening') : STEPS[currentStep]}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {canEdit ? (missing.length ? `${REQUIRED.length - missing.length} of ${REQUIRED.length} required proofs uploaded` : 'All required proofs are uploaded.') : `Step ${currentStep + 1} of ${STEPS.length} in your application`}
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-[#b8df8c] transition-all" style={{ width: `${canEdit ? ((REQUIRED.length - missing.length) / REQUIRED.length) * 100 : progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e1e8dc] bg-white px-5 py-5 shadow-[0_8px_30px_-22px_rgba(31,56,39,.35)] sm:px-7">
        <ol className="grid min-w-[590px] grid-cols-5 gap-2" aria-label="Application progress">
          {STEPS.map((step, i) => {
            const state = stepReached(i, data.status);
            return (
              <li key={step} aria-current={state === 'current' ? 'step' : undefined} className="relative flex items-center gap-2.5">
                <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${state === 'done' ? 'bg-[#e8f5e9] text-[#3e7951]' : state === 'current' ? 'bg-[#4f8c3b] text-white shadow-[0_0_0_4px_#edf5e8]' : 'bg-[#f1f3ef] text-[#96a398]'}`}>
                  {state === 'done' ? <Icon name="check" size={16} /> : String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-xs font-semibold sm:text-sm ${state === 'current' ? 'text-[#244c32]' : state === 'done' ? 'text-[#51745a]' : 'text-ink-400'}`}>{step}</span>
                {i < STEPS.length - 1 && <span className="absolute -right-1 top-1/2 hidden h-px w-5 bg-[#dfe7dd] xl:block" />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="documents-heading" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b8a69]">Step 02 / Documents</p>
              <h2 id="documents-heading" className="mt-1 font-display text-[27px] font-semibold tracking-tight text-[#203d2c]">Your documents</h2>
              <p className="mt-1 text-sm text-ink-500">Three essentials help us review your application.</p>
            </div>
            <span className="rounded-full bg-[#eaf3e6] px-3 py-1.5 text-xs font-semibold text-[#376a3b]">{REQUIRED.length - missing.length} of {REQUIRED.length} complete</span>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-[#e0e8dc] bg-white shadow-[0_12px_34px_-26px_rgba(31,56,39,.5)]">
            {REQUIRED_DETAILS.map(({ type, label, detail, number }) => {
              const uploaded = documents.filter((d) => d.type === type && d.mimeType === 'application/pdf');
              return (
                <div key={type} className="flex flex-wrap items-center gap-3 border-b border-[#edf1eb] px-5 py-5 sm:flex-nowrap sm:gap-4 sm:px-6">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${uploaded.length ? 'bg-[#e9f4e5] text-[#477d42]' : 'bg-[#f4f5f0] text-[#a0aa9a]'}`}>
                    {uploaded.length ? <Icon name="check" size={20} /> : <Icon name="file" size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#263c2e]">{label}</h3>
                      <span className="text-xs text-[#a2ada0]">{number}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{uploaded.length ? uploaded.map((d) => d.originalName).join(', ') : detail}</p>
                  </div>
                  <span className={`ml-14 rounded-full px-3 py-1 text-xs font-semibold sm:ml-0 ${uploaded.length ? 'bg-[#e9f4e5] text-[#3e7948]' : 'bg-[#fff6e9] text-[#a8752e]'}`}>
                    {uploaded.length ? 'Uploaded' : 'Needed'}
                  </span>
                </div>
              );
            })}
            <div className="bg-[#f8faf6] px-5 py-3 text-xs text-ink-500 sm:px-6">
              {missing.length ? `${missing.length} required ${missing.length === 1 ? 'document' : 'documents'} remaining${canEdit ? ' before screening' : ''}.` : canEdit ? 'All required documents are ready. You can submit for screening.' : 'All required documents have been uploaded.'}
            </div>
          </div>

          {documents.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#203d2c]">Uploaded files</h3>
                <span className="text-xs text-ink-400">{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
              </div>
              <ul className="divide-y divide-[#edf1eb] overflow-hidden rounded-2xl border border-[#e0e8dc] bg-white">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f5ed] text-[#55804d]"><Icon name="file" size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">{d.originalName}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{d.type.replaceAll('_', ' ')}</p>
                      {d.extractedData?.reviewReason && <p className="mt-1 text-xs text-ink-500">{d.extractedData.reviewReason}</p>}
                    </div>
                    <div className="ml-12 flex items-center gap-2 sm:ml-0">
                      <Badge>{d.verification}</Badge>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => void openPrivateFile(d.path)}>View</button>
                      {canEdit && <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => removeDoc.mutate(d.id)} disabled={removeDoc.isPending}>Remove</button>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {removeDoc.error && <div className="mt-3"><ErrorBanner message={apiErrorMessage(removeDoc.error)} /></div>}
        </section>

        <aside className="lg:sticky lg:top-6">
          {canEdit && (
            <div className="overflow-hidden rounded-[22px] border border-[#dce7d8] bg-white shadow-[0_12px_34px_-26px_rgba(31,56,39,.5)]">
              <div className="border-b border-[#e9eee5] bg-[#f1f7ed] px-6 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#4b7f45] shadow-sm"><Icon name="plus" size={20} /></span>
                <h2 className="mt-4 font-display text-xl font-semibold text-[#203d2c]">Add a document</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">Upload a clear PDF of your proof for screening.</p>
              </div>
              <div className="space-y-4 p-6">
                <label className="block text-xs font-semibold text-[#425747]" htmlFor="application-document-type">Document type</label>
                <select id="application-document-type" className="input -mt-2 w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                </select>
                <label htmlFor="application-document-file" className="flex min-h-[116px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#a8c3a0] bg-[#fafcf8] px-4 py-4 text-center transition-colors hover:bg-[#f0f7eb]">
                  <Icon name="file" size={23} className="mb-2 text-[#648c5d]" />
                  <span className="max-w-full truncate text-sm font-semibold text-[#365d3c]">{selectedFile || 'Choose a file to upload'}</span>
                  <span className="mt-1 text-xs text-ink-400">PDF only · scanned pages are read with OCR</span>
                </label>
                <input id="application-document-file" ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? '')} />
                <button type="button" className="btn-primary w-full justify-center" onClick={() => upload.mutate()} disabled={upload.isPending || !selectedFile}>
                  {upload.isPending ? 'Uploading…' : 'Upload document'} <Icon name="arrowUpRight" size={16} />
                </button>
                {upload.error && <ErrorBanner message={apiErrorMessage(upload.error)} />}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="mt-4 rounded-[22px] border border-[#e0e8dc] bg-white p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b8a69]">When you’re ready</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#203d2c]">Send for screening</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">Your application moves to review once all three proofs are uploaded.</p>
              <button type="button" className="btn-primary mt-5 w-full justify-center" onClick={() => submit.mutate()} disabled={submit.isPending || missing.length > 0} title={missing.length > 0 ? 'Upload all required documents first' : ''}>
                <Icon name="sparkles" size={16} /> {submit.isPending ? 'Submitting…' : 'Submit for AI screening'}
              </button>
              {submit.error && <div className="mt-3"><ErrorBanner message={apiErrorMessage(submit.error)} /></div>}
            </div>
          )}

          {canEdit && <button type="button" className="mt-5 w-full py-2 text-center text-sm font-medium text-ink-400 transition-colors hover:text-rose-600" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>{withdraw.isPending ? 'Withdrawing…' : 'Withdraw application'}</button>}
          {withdraw.error && <div className="mt-3"><ErrorBanner message={apiErrorMessage(withdraw.error)} /></div>}
        </aside>
      </div>

      {(elig || docv) && (
        <section className="mt-9" aria-labelledby="screening-heading">
          <h2 id="screening-heading" className="font-display text-2xl font-semibold text-[#203d2c]">AI screening</h2>
          <p className="mb-4 mt-1 text-sm text-ink-500">Advisory only: the owner reviews these and makes the final decision.</p>
          <div className="space-y-4 rounded-[22px] border border-[#e0e8dc] bg-white p-6">
            {elig && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl font-semibold text-violet-700">{elig.scoreLabel === 'Evidence-based criteria match' ? `${elig.score}%` : 'Needs re-screening'}</span>
                  <span className="text-xs text-ink-500">{elig.scoreLabel === 'Evidence-based criteria match' ? elig.scoreLabel : 'The owner needs to re-run document screening.'}</span>
                </div>
                {elig.scoreLabel === 'Evidence-based criteria match' && elig.warnings?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-amber-600">
                    {elig.warnings.map((w: string, i: number) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {docv && elig?.scoreLabel === 'Evidence-based criteria match' && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                Documents: <Badge>{docv.overallStatus}</Badge>
                <span className="text-ink-500">{docv.source === 'RULE_BASED_FALLBACK' ? 'Content inspection unavailable; manual review required' : `proof checks passed ${docv.consistencyScore}%`}</span>
              </p>
            )}
          </div>
        </section>
      )}

      {data.status === 'APPROVED' && data.assignment && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Icon name="check" size={16} className="mt-0.5" />
          Approved: you've been assigned to this room. See your dashboard for lease and rent details.
        </div>
      )}
      {data.status === 'REJECTED' && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <Icon name="x" size={16} className="mt-0.5" />
          This application was not approved.
          {data.decisionReason && ` Reason: ${data.decisionReason}`}
        </div>
      )}
    </div>
  );
}
