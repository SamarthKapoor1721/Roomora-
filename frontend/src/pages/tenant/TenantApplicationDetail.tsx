import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Badge,
  Card,
  ErrorBanner,
  Field,
  InlineNote,
  PageHeader,
  Section,
  Spinner,
  date,
} from '../../components/ui';

const STEPS = ['Applied', 'Documents', 'AI screening', 'Owner review', 'Decision'];
function stepReached(i: number, status: string): 'done' | 'current' | 'todo' {
  const reached = [
    true,
    ['DOCS_PENDING', 'UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(status),
    ['APPROVED', 'REJECTED'].includes(status),
  ];
  if (reached[i] && (i === 4 || !reached[i + 1])) return 'current';
  return reached[i] ? 'done' : 'todo';
}

const DOC_TYPES = ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF', 'EMPLOYMENT_LETTER', 'BANK_STATEMENT', 'PHOTO', 'OTHER'];
const REQUIRED = ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF'];

export default function TenantApplicationDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('ID_PROOF');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'application', id],
    queryFn: async () => (await api.get(`/tenant/applications/${id}`)).data.data,
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
      qc.invalidateQueries({ queryKey: ['tenant', 'application', id] });
    },
  });
  const removeDoc = useMutation({
    mutationFn: async (docId: string) => (await api.delete(`/tenant/applications/${id}/documents/${docId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });
  const submit = useMutation({
    mutationFn: async () => (await api.post(`/tenant/applications/${id}/submit`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });
  const withdraw = useMutation({
    mutationFn: async () => (await api.post(`/tenant/applications/${id}/withdraw`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'application', id] }),
  });

  if (isLoading) return <Spinner label="Loading application…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;
  if (!data) return null;

  const provided: string[] = data.documents.map((d: { type: string }) => d.type);
  const missing = REQUIRED.filter((r) => !provided.includes(r));
  const canEdit = ['DOCS_PENDING', 'SUBMITTED'].includes(data.status);
  const elig = data.eligibility;
  const docv = data.docVerification;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: 'My applications', to: '/tenant/applications' }, { label: data.room.name }]}
        title={`${data.room.property.name} · ${data.room.name}`}
        description={`Applied ${date(data.createdAt)}`}
        actions={<Badge>{data.status}</Badge>}
      />

      {/* progress tracker */}
      <ol className="mb-8 flex flex-wrap items-center gap-x-1 gap-y-2">
        {STEPS.map((step, i) => {
          const state = stepReached(i, data.status);
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  state === 'done'
                    ? 'bg-emerald-50 text-emerald-700'
                    : state === 'current'
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 text-ink-400'
                }`}
              >
                {state === 'done' && <Icon name="check" size={12} />}
                {step}
              </span>
              {i < STEPS.length - 1 && <Icon name="chevronRight" size={12} className="text-ink-300" />}
            </li>
          );
        })}
      </ol>

      <Section title="Documents" description={canEdit ? 'Upload ID, address and income proof, then submit for screening.' : undefined}>
        {missing.length > 0 && canEdit && (
          <InlineNote tone="warning">
            Still required: {missing.map((m) => m.replaceAll('_', ' ')).join(', ')}
          </InlineNote>
        )}
        <Card pad={false} className={missing.length > 0 && canEdit ? 'mt-3' : ''}>
          <ul className="divide-y divide-slate-100">
            {data.documents.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-400">No documents uploaded yet.</li>
            )}
            {data.documents.map(
              (d: { id: string; type: string; originalName: string; path: string; verification: string }) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800">{d.type.replaceAll('_', ' ')}</p>
                    <p className="truncate text-xs text-ink-400">{d.originalName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{d.verification}</Badge>
                    <a className="btn-secondary btn-sm" href={`/uploads/${d.path}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                    {canEdit && (
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => removeDoc.mutate(d.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>

          {canEdit && (
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <Field label="Document type" className="w-48">
                <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </Field>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-700 file:ring-1 file:ring-slate-300"
              />
              <button className="btn-secondary" onClick={() => upload.mutate()} disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}
        </Card>
        {upload.error && (
          <div className="mt-2">
            <ErrorBanner message={apiErrorMessage(upload.error)} />
          </div>
        )}

        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={() => submit.mutate()}
              disabled={submit.isPending || missing.length > 0}
              title={missing.length > 0 ? 'Upload all required documents first' : ''}
            >
              <Icon name="sparkles" size={16} />
              {submit.isPending ? 'Submitting…' : 'Submit for AI screening'}
            </button>
            <button className="btn-danger-quiet" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>
              Withdraw application
            </button>
          </div>
        )}
        {submit.error && (
          <div className="mt-2">
            <ErrorBanner message={apiErrorMessage(submit.error)} />
          </div>
        )}
      </Section>

      {(elig || docv) && (
        <Section title="AI screening" description="Advisory only: the owner reviews these and makes the final decision.">
          <Card className="space-y-4">
            {elig && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl font-semibold text-violet-700">{elig.score}%</span>
                  <span className="text-xs text-ink-500">{elig.scoreLabel}</span>
                </div>
                {elig.warnings?.length > 0 && (
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
            {docv && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                Documents: <Badge>{docv.overallStatus}</Badge>
                <span className="text-ink-500">consistency {docv.consistencyScore}%</span>
              </p>
            )}
          </Card>
        </Section>
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
