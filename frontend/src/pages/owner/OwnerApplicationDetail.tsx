import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  AiSourceTag,
  Badge,
  Card,
  ErrorBanner,
  Field,
  InlineNote,
  NumberInput,
  PageHeader,
  Section,
  Spinner,
  money,
  date,
} from '../../components/ui';

export default function OwnerApplicationDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'application', id],
    queryFn: async () => (await api.get(`/owner/applications/${id}`)).data.data,
  });

  const rerun = useMutation({
    mutationFn: async () => (await api.post(`/owner/applications/${id}/rerun-ai`)).data,
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
        await api.post(`/owner/applications/${id}/decision`, {
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

  const elig = data.eligibility;
  const docv = data.docVerification;
  const summary = data.summary;
  const finalised = ['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(data.status);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: 'Applications', to: '/owner/applications' }, { label: data.tenant.fullName }]}
        title={data.tenant.fullName}
        description={`Applying for ${data.room.property.name} · ${data.room.name}`}
        actions={<Badge>{data.status}</Badge>}
      />

      <Section title="Applicant">
        <Card>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReadField label="Email" value={data.tenant.email} />
            <ReadField label="Phone" value={data.tenant.phone ?? '—'} />
            <ReadField label="Applied" value={date(data.createdAt)} />
            <ReadField label="Monthly income" value={data.monthlyIncome ? money(data.monthlyIncome) : '—'} />
            <ReadField label="Employment" value={data.employmentStatus ?? '—'} />
            <ReadField label="Employer" value={data.employerName ?? '—'} />
            <ReadField label="Occupants" value={String(data.occupants)} />
            <ReadField
              label="Lifestyle"
              value={`${data.hasPets ? 'Has pets' : 'No pets'} · ${data.smoker ? 'Smoker' : 'Non-smoker'}`}
            />
            <ReadField label="Food opt-in" value={data.foodOptIn ? 'Yes' : 'No'} />
          </div>
          {data.notes && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-ink-600">{data.notes}</p>
          )}
        </Card>
      </Section>

      <Section title={`Documents (${data.documents.length})`}>
        <Card pad={false}>
          <ul className="divide-y divide-slate-100">
            {data.documents.map(
              (d: { id: string; type: string; originalName: string; path: string; verification: string }) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800">{d.type.replaceAll('_', ' ')}</p>
                    <p className="truncate text-xs text-ink-400">{d.originalName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{d.verification}</Badge>
                    <a
                      className="btn-secondary btn-sm"
                      href={`/uploads/${d.path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="arrowUpRight" size={13} />
                      View
                    </a>
                  </div>
                </li>
              ),
            )}
          </ul>
        </Card>
      </Section>

      <Section title="AI screening" description="Advisory only — these results never approve or reject anyone.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Eligibility</h3>
              {elig && <AiSourceTag source={elig.source} />}
            </div>
            {!elig ? (
              <p className="text-sm text-ink-400">Not screened yet.</p>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <span className="font-display text-3xl font-semibold text-violet-700">{elig.score}%</span>
                  <span className="pb-1 text-xs text-ink-500">
                    {elig.scoreLabel} · {elig.recommendation}
                  </span>
                </div>
                <List title="Reasons" items={elig.reasons} tone="text-ink-600" />
                <List title="Warnings" items={elig.warnings} tone="text-amber-600" />
                <List title="Missing requirements" items={elig.missingRequirements} tone="text-rose-600" />
              </>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Document verification</h3>
              {docv && <AiSourceTag source={docv.source} />}
            </div>
            {!docv ? (
              <p className="text-sm text-ink-400">Not screened yet.</p>
            ) : (
              <>
                <p className="flex items-center gap-2">
                  <Badge>{docv.overallStatus}</Badge>
                  <span className="text-sm text-ink-500">consistency {docv.consistencyScore}%</span>
                </p>
                <List title="Inconsistencies" items={docv.inconsistencies} tone="text-rose-600" />
                <List title="Missing documents" items={docv.missingDocuments} tone="text-amber-600" />
                {docv.notes && <p className="mt-3 text-xs text-ink-500">{docv.notes}</p>}
              </>
            )}
          </Card>
        </div>

        {summary && (
          <Card className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Summary</h3>
              <AiSourceTag source={summary.source} />
            </div>
            <p className="text-sm text-ink-700">{summary.summary}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <List title="Highlights" items={summary.highlights} tone="text-emerald-600" />
              <List title="Concerns" items={summary.concerns} tone="text-amber-600" />
            </div>
          </Card>
        )}
      </Section>

      {!finalised ? (
        <Section title="Your decision">
          <InlineNote>
            The screening above is advisory. You make the final call — approving creates the assignment and lease.
          </InlineNote>
          {decide.error && (
            <div className="mt-3">
              <ErrorBanner message={apiErrorMessage(decide.error)} />
            </div>
          )}

          <div className="mt-3 space-y-3">
            {/* Approve — the primary path */}
            <Card className="border-brand-200">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-900">Approve &amp; create lease</h3>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => rerun.mutate()}
                  disabled={rerun.isPending}
                >
                  <Icon name="sparkles" size={13} />
                  {rerun.isPending ? 'Re-running…' : 'Re-run AI'}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                className="btn-primary mt-4"
                onClick={() => decide.mutate('APPROVE')}
                disabled={decide.isPending}
              >
                <Icon name="check" size={16} />
                Approve &amp; assign
              </button>
            </Card>

            {/* Reject — secondary */}
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-ink-900">Reject</h3>
              <Field label="Reason (optional — shared with the tenant)">
                <input
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. income below the 2× threshold"
                />
              </Field>
              <button
                className="btn-danger-quiet mt-3"
                onClick={() => decide.mutate('REJECT')}
                disabled={decide.isPending}
              >
                Reject application
              </button>
            </Card>
          </div>
        </Section>
      ) : (
        data.decisionReason && (
          <Section title="Decision">
            <Card>
              <p className="text-sm text-ink-700">{data.decisionReason}</p>
            </Card>
          </Section>
        )
      )}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm text-ink-800">{value}</p>
    </div>
  );
}

function List({ title, items, tone = 'text-ink-600' }: { title: string; items?: string[]; tone?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      <ul className={`space-y-1 text-sm ${tone}`}>
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
