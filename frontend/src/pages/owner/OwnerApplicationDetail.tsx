import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiErrorMessage, openPrivateFile } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { ErrorBanner, Field, NumberInput, Spinner, date, money } from '../../components/ui';

type ReviewDocument = {
  id: string;
  type: string;
  originalName: string;
  path: string;
  verification: string;
  extractedData?: {
    reviewReason?: string;
    fieldChecks?: Record<string, string>;
  };
};

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

function checkLabel(value: string) {
  if (value === 'dateOfBirth') return 'Date of birth';
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

function statusColor(status: string) {
  if (status === 'VERIFIED' || status === 'MATCH' || status === 'APPROVED') return 'text-emerald-800';
  if (status === 'PENDING') return 'text-slate-600';
  return 'text-amber-800';
}

export default function OwnerApplicationDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'application', id],
    queryFn: async () => (await api.get('/owner/applications/' + id)).data.data,
  });

  const rerun = useMutation({
    mutationFn: async () => (await api.post('/owner/applications/' + id + '/rerun-ai')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'application', id] }),
  });

  const [reason, setReason] = useState('');
  const [lease, setLease] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    rentDueDay: 5,
    foodOptIn: false,
  });

  const decide = useMutation({
    mutationFn: async (decision: 'APPROVE' | 'REJECT') =>
      (
        await api.post('/owner/applications/' + id + '/decision', {
          decision,
          reason: reason || undefined,
          lease: decision === 'APPROVE' ? lease : undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'applications'] });
      navigate('/owner/applications');
    },
  });

  if (isLoading) return <Spinner label="Loading application…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;
  if (!data) return null;

  const documents: ReviewDocument[] = data.documents ?? [];
  const elig = data.eligibility;
  const docv = data.docVerification;
  const summary = data.summary;
  const currentScreening = elig?.scoreLabel === 'Evidence-based criteria match';
  const finalised = ['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(data.status);
  const documentsNeedingReview = documents.filter((document) => document.verification !== 'VERIFIED').length;
  const reviewRequired = currentScreening && (elig.recommendation === 'REVIEW' || documentsNeedingReview > 0);
  const headline = finalised
    ? 'Decision recorded'
    : !currentScreening
    ? 'Screening pending'
    : reviewRequired
      ? 'Manual review required'
      : 'Ready for owner decision';
  const supportingEvidence: string[] = [...new Set([...(elig?.reasons ?? []), ...(summary?.highlights ?? [])])];
  const reviewItems: string[] = [...new Set([
    ...(docv?.inconsistencies ?? []),
    ...(elig?.warnings ?? []),
    ...(elig?.missingRequirements ?? []),
    ...(docv?.missingDocuments ?? []),
    ...(summary?.concerns ?? []),
  ])];
  const score = currentScreening ? Math.max(0, Math.min(100, Number(elig.score) || 0)) : 0;
  const scoreAccent = score >= 80 ? '#8ce6aa' : score >= 50 ? '#f6cf78' : '#ff9d79';
  const scoreCircumference = 2 * Math.PI * 66;

  return (
    <div className="mx-auto max-w-[1160px] pb-16 text-ink-800">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-500">
        <Link to="/owner/applications" className="hover:text-brand-700">Applications</Link>
        <span className="mx-2 text-ink-300">/</span>
        <span className="text-ink-700">{data.tenant.fullName}</span>
      </nav>

      <article className="border border-slate-200 bg-white shadow-[0_10px_35px_-24px_rgba(22,42,30,0.35)]">
        <header className="border-t-4 border-brand-800 px-6 pb-7 pt-6 sm:px-9 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-brand-700">Roomora / Application review</p>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
                {data.applicantName ?? data.tenant.fullName}
              </h1>
              <p className="mt-2 text-sm text-ink-600">{data.room.property.name} <span className="mx-1.5 text-ink-300">·</span> {data.room.name}</p>
            </div>
            <dl className="grid min-w-[190px] grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-ink-400">Case</dt>
              <dd className="text-right font-mono font-medium text-ink-800">{String(data.id ?? id).slice(-10).toUpperCase()}</dd>
              <dt className="text-ink-400">Received</dt>
              <dd className="text-right font-medium text-ink-800">{date(data.createdAt)}</dd>
              <dt className="text-ink-400">Status</dt>
              <dd className="text-right font-medium text-ink-800">{label(data.status)}</dd>
            </dl>
          </div>
        </header>

        <section aria-labelledby="review-outcome" className="grid border-y border-slate-200 bg-[#f8faf7] lg:grid-cols-[1fr_330px]">
          <div className="px-6 py-7 sm:px-9">
            <ReportHeading number="01" title="Review outcome" id="review-outcome" />
            <h2 className="mt-5 font-display text-2xl font-semibold text-ink-900">{headline}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              {currentScreening
                ? summary?.summary ?? 'Review the document findings and applicant declaration before making a decision.'
                : 'Run screening to compare the submitted PDFs with the applicant declaration.'}
            </p>
            {currentScreening && (
              <p className="mt-4 text-xs font-medium text-ink-700">
                {documentsNeedingReview} of {documents.length} submitted documents require attention
              </p>
            )}
          </div>
          <div className="flex items-center justify-center border-t border-slate-200 px-6 py-7 lg:border-l lg:border-t-0">
            <div
              className="relative flex h-[170px] w-[170px] items-center justify-center"
              role="img"
              aria-label={currentScreening ? 'Advisory score ' + score + ' out of 100' : 'Advisory score unavailable'}
            >
              <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="80" cy="80" r="66" fill="none" stroke="#dce5de" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="66" fill="none" stroke={scoreAccent} strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={scoreCircumference}
                  strokeDashoffset={scoreCircumference * (1 - score / 100)}
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-[60px] font-semibold leading-none tabular-nums tracking-tight text-ink-900">
                  {currentScreening ? score : '—'}
                </p>
                <p className="mt-1 text-xs font-medium text-ink-400">/ 100</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="document-findings" className="px-6 py-8 sm:px-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <ReportHeading number="02" title="Document findings" id="document-findings" />
            <span className="text-xs text-ink-500">{documents.length} documents submitted</span>
          </div>
          <p className="mt-2 text-sm text-ink-500">The assessment compares extracted PDF text with the details supplied in the application.</p>

          <div className="mt-5 overflow-x-auto border-y border-slate-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  <th className="w-[22%] px-3 py-3 font-semibold">Proof</th>
                  <th className="w-[40%] px-3 py-3 font-semibold">Finding</th>
                  <th className="w-[18%] px-3 py-3 font-semibold">Assessment</th>
                  <th className="w-[20%] px-3 py-3 text-right font-semibold">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => {
                  const checks = Object.entries(document.extractedData?.fieldChecks ?? {});
                  return (
                    <tr key={document.id} className="align-top">
                      <td className="px-3 py-4 font-medium text-ink-800">{label(document.type)}</td>
                      <td className="px-3 py-4">
                        {checks.length > 0 && (
                          <p className="mb-1.5 text-xs text-ink-600">
                            {checks.map(([field, result], index) => (
                              <span key={field}>
                                {index > 0 && <span className="mx-2 text-ink-300">/</span>}
                                {checkLabel(field)} <strong className={'font-semibold ' + statusColor(result)}>{label(result).toLowerCase()}</strong>
                              </span>
                            ))}
                          </p>
                        )}
                        <p className="leading-5 text-ink-700">
                          {document.extractedData?.reviewReason ?? 'No document finding recorded.'}
                        </p>
                      </td>
                      <td className={'px-3 py-4 font-semibold ' + statusColor(document.verification)}>
                        {label(document.verification)}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          className="max-w-[210px] text-right text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
                          title={document.originalName}
                          onClick={() => void openPrivateFile(document.path)}
                        >
                          <span className="block truncate">{document.originalName}</span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-ink-500">
                            View file <Icon name="arrowUpRight" size={12} />
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {documents.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-500">No documents submitted.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="applicant-declaration" className="border-t border-slate-200 px-6 py-8 sm:px-9">
          <ReportHeading number="03" title="Applicant declaration" id="applicant-declaration" />
          <dl className="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
            <ReportField label="Legal name" value={data.applicantName ?? data.tenant.fullName} />
            <ReportField label="Date of birth" value={data.dateOfBirth ?? 'Not supplied'} />
            <ReportField label="Current address" value={data.currentAddress ?? 'Not supplied'} />
            <ReportField label="Email" value={data.tenant.email} />
            <ReportField label="Phone" value={data.tenant.phone ?? 'Not supplied'} />
            <ReportField label="Monthly income" value={data.monthlyIncome ? money(data.monthlyIncome) : 'Not supplied'} />
            <ReportField label="Employment" value={data.employmentStatus ?? 'Not supplied'} />
            <ReportField label="Employer" value={data.employerName ?? 'Not supplied'} />
            <ReportField label="Occupants" value={String(data.occupants)} />
            <ReportField label="Family or relatives moving in" value={data.hasFamilyMembers ? 'Yes' : 'No'} />
            <ReportField label="Pets" value={data.hasPets ? 'Yes' : 'No'} />
            <ReportField label="Smoking" value={data.smoker ? 'Yes' : 'No'} />
            <ReportField label="Food opt-in" value={data.foodOptIn ? 'Yes' : 'No'} />
          </dl>
          {data.hasFamilyMembers && data.familyDetails && (
            <div className="mt-5 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-ink-600">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Family or relative details · self-reported</p>
              <p className="mt-1 whitespace-pre-wrap">{data.familyDetails}</p>
            </div>
          )}
          {data.notes && (
            <div className="mt-5 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-ink-600">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Applicant notes</p>
              <p className="mt-1">{data.notes}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="assessment-notes" className="border-t border-slate-200 px-6 py-8 sm:px-9">
          <ReportHeading number="04" title="Assessment notes" id="assessment-notes" />
          {!currentScreening ? (
            <p className="mt-4 text-sm text-ink-500">Document content has not been screened for this application.</p>
          ) : (
            <>
              <div className="mt-5 grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">Criteria and supporting evidence</h3>
                  <ReportList items={supportingEvidence} empty="No criteria recorded." />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">Items for manual review</h3>
                  <ReportList items={reviewItems} />
                  {reviewItems.length === 0 && (
                    <p className="mt-3 text-sm text-ink-500">No review items recorded.</p>
                  )}
                </div>
              </div>
              {docv && (
                <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-ink-500">
                  Document assessment: <span className={'font-semibold ' + statusColor(docv.overallStatus)}>{label(docv.overallStatus)}</span>
                  {docv.source === 'RULE_BASED_FALLBACK' ? ' · Content inspection unavailable' : ' · Proof checks passed ' + docv.consistencyScore + '%'}
                  {docv.notes ? ' · ' + docv.notes : ''}
                </p>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="decision-record" className="border-t border-slate-200 bg-[#fafbf9] px-6 py-8 sm:px-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReportHeading number="05" title="Decision record" id="decision-record" />
            {!finalised && (
              <button
                type="button"
                className="text-xs font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900 disabled:opacity-50"
                onClick={() => rerun.mutate()}
                disabled={rerun.isPending}
              >
                {rerun.isPending ? 'Running screening…' : 'Run screening again'}
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-ink-600">Screening is advisory. The property owner reviews the evidence and records the final decision.</p>

          {rerun.error && <div className="mt-4"><ErrorBanner message={apiErrorMessage(rerun.error)} /></div>}
          {decide.error && <div className="mt-4"><ErrorBanner message={apiErrorMessage(decide.error)} /></div>}

          {finalised ? (
            <dl className="mt-6 border-t border-slate-200 pt-5">
              <ReportField label="Final status" value={label(data.status)} />
              {data.decisionReason && <ReportField label="Recorded reason" value={data.decisionReason} />}
            </dl>
          ) : (
            <div className="mt-6 grid border-t border-slate-200 pt-6 lg:grid-cols-[1fr_0.72fr] lg:gap-10">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-900">Approve and create lease</h3>
                <p className="mt-1 text-xs text-ink-500">Approval creates the room assignment and lease.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="Lease start">
                    <input
                      className="input"
                      type="date"
                      value={lease.startDate}
                      onChange={(e) => setLease({ ...lease, startDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Lease end">
                    <input
                      className="input"
                      type="date"
                      value={lease.endDate}
                      onChange={(e) => setLease({ ...lease, endDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Rent due day" hint="1–28">
                    <NumberInput
                      value={lease.rentDueDay}
                      onChange={(rentDueDay) => setLease({ ...lease, rentDueDay })}
                      min={1}
                      max={28}
                    />
                  </Field>
                  <label className="mt-6 flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={lease.foodOptIn}
                      onChange={(e) => setLease({ ...lease, foodOptIn: e.target.checked })}
                    />
                    Food opt-in
                  </label>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-5"
                  onClick={() => decide.mutate('APPROVE')}
                  disabled={decide.isPending}
                >
                  <Icon name="check" size={16} />
                  Approve and assign
                </button>
              </div>
              <div className="mt-8 border-t border-slate-200 pt-7 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                <h3 className="font-display text-lg font-semibold text-ink-900">Reject application</h3>
                <p className="mt-1 text-xs text-ink-500">The reason is shared with the applicant when provided.</p>
                <div className="mt-5">
                  <Field label="Reason (optional)">
                    <textarea
                      className="input min-h-[104px] resize-y"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Record the reason for this decision"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn-danger-quiet mt-5"
                  onClick={() => decide.mutate('REJECT')}
                  disabled={decide.isPending}
                >
                  Reject application
                </button>
              </div>
            </div>
          )}
        </section>
      </article>
    </div>
  );
}

function ReportHeading({ number, title, id }: { number: string; title: string; id: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-xs text-brand-700">{number}</span>
      <h2 id={id} className="font-display text-lg font-semibold text-ink-900">{title}</h2>
    </div>
  );
}

function ReportField({ label: fieldLabel, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">{fieldLabel}</dt>
      <dd className="mt-1 text-sm leading-5 text-ink-800">{value}</dd>
    </div>
  );
}

function ReportList({ items, empty }: { items?: string[]; empty?: string }) {
  if (!items?.length) return empty ? <p className="mt-3 text-sm text-ink-500">{empty}</p> : null;
  return (
    <ul className="mt-3 space-y-2 text-sm leading-5 text-ink-700">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
