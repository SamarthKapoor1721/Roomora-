import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, EmptyState, ErrorBanner, FilterSelect, PageHeader, Skeleton, date } from '../../components/ui';

interface AppRow {
  id: string;
  status: string;
  createdAt: string;
  tenant: { fullName: string; email: string };
  room: { name: string; property: { name: string } };
  eligibility?: { score: number; scoreLabel: string; recommendation: string } | null;
  docVerification?: { overallStatus: string; consistencyScore: number } | null;
  _count: { documents: number };
}

const STATUS_OPTIONS = ['OWNER_REVIEW', 'UNDER_AI_REVIEW', 'DOCS_PENDING', 'APPROVED', 'REJECTED'];

export default function OwnerApplications() {
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'applications'],
    queryFn: async () => (await api.get('/owner/applications')).data.data as AppRow[],
  });

  const rows = (data ?? []).filter((a) => statuses.size === 0 || statuses.has(a.status));

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Tenant applications for your rooms. Open one to see the AI screening and make your decision."
        actions={
          <FilterSelect
            label="Status"
            options={STATUS_OPTIONS.map((v) => ({
              value: v,
              count: (data ?? []).filter((a) => a.status === v).length,
            }))}
            selected={statuses}
            onChange={setStatuses}
          />
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={apiErrorMessage(error)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={statuses.size ? 'No applications match this filter' : 'No applications yet'}
          hint={
            statuses.size
              ? 'Try removing a status from the filter.'
              : 'Applications show up here once a tenant applies and submits for screening.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((a) => (
            <Link
              key={a.id}
              to={`/owner/applications/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  {a.tenant.fullName}
                  <span className="font-normal text-ink-400"> → {a.room.property.name} · {a.room.name}</span>
                </p>
                <p className="text-xs text-ink-500">
                  {a.tenant.email} · applied {date(a.createdAt)} · {a._count.documents} document(s)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {a.eligibility && (
                  <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-2xs font-semibold text-violet-700">
                    {a.eligibility.scoreLabel}: {a.eligibility.score}%
                  </span>
                )}
                <Badge>{a.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
