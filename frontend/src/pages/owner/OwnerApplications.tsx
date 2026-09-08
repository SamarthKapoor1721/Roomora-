import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { AiSourceTag, Badge, EmptyState, ErrorBanner, PageHeader, Skeleton, date } from '../../components/ui';

interface AppRow {
  id: string;
  status: string;
  createdAt: string;
  tenant: { fullName: string; email: string };
  room: { name: string; property: { name: string } };
  eligibility?: { score: number; scoreLabel: string; recommendation: string; source: string } | null;
  docVerification?: { overallStatus: string; consistencyScore: number; source: string } | null;
  _count: { documents: number };
}

const statuses = ['', 'OWNER_REVIEW', 'UNDER_AI_REVIEW', 'DOCS_PENDING', 'APPROVED', 'REJECTED'];

export default function OwnerApplications() {
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'applications', status],
    queryFn: async () =>
      (await api.get(`/owner/applications${status ? `?status=${status}` : ''}`)).data.data as AppRow[],
  });

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Tenant applications for your rooms. Open one to see the AI screening and make your decision."
        actions={
          <select className="input w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s ? s.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </select>
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
      ) : data?.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No applications yet"
          hint="Applications show up here once a tenant applies and submits for screening."
        />
      ) : (
        <div>
          {data?.map((a) => (
            <Link
              key={a.id}
              to={`/owner/applications/${a.id}`}
              className="row -mx-2 flex flex-wrap items-center justify-between gap-3 rounded px-2 transition-colors hover:bg-slate-50"
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
                {a.eligibility && <AiSourceTag source={a.eligibility.source} />}
                <Badge>{a.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
