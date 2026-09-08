import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { AiSourceTag, Badge, EmptyState, ErrorBanner, PageHeader, Skeleton, date } from '../../components/ui';

interface AppRow {
  id: string;
  status: string;
  createdAt: string;
  room: { name: string; property: { name: string; city: string } };
  eligibility?: { score: number; scoreLabel: string; source: string } | null;
  _count: { documents: number };
}

export default function TenantApplications() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'applications'],
    queryFn: async () => (await api.get('/tenant/applications')).data.data as AppRow[],
  });

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="My applications"
        description="Track each application through documents, AI screening, and the owner's decision."
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No applications yet"
          hint="Browse rooms that are open for applications and apply to get started."
        />
      ) : (
        <div className="space-y-2.5">
          {data?.map((a) => (
            <Link
              key={a.id}
              to={`/tenant/applications/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-pop"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {a.room.property.name} · {a.room.name}
                </p>
                <p className="text-xs text-ink-500">
                  {a.room.property.city} · applied {date(a.createdAt)} · {a._count.documents} document(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
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
