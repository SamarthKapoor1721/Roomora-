import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  AiSourceTag,
  EmptyState,
  ErrorBanner,
  PageHeader,
  RailFilters,
  RailStats,
  Spinner,
  SplitLayout,
  money,
  date,
} from '../../components/ui';

interface LeaseRow {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  foodCharge: string;
  tenant: { fullName: string; email: string };
  room: { name: string; property: { name: string } };
  aiSummary?: string | null;
  aiSummarySource?: string | null;
}

type Filter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export default function OwnerLeases() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'leases'],
    queryFn: async () => (await api.get('/owner/leases')).data.data as LeaseRow[],
  });

  const summarize = useMutation({
    mutationFn: async (id: string) => (await api.post(`/owner/leases/${id}/summarize`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'leases'] }),
  });
  const terminate = useMutation({
    mutationFn: async (id: string) => (await api.post(`/owner/leases/${id}/terminate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'leases'] }),
  });

  const leaseStatus: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    EXPIRED: 'bg-slate-100 text-ink-600 ring-slate-500/20',
    TERMINATED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };

  const stats = useMemo(() => {
    const s = { ALL: 0, ACTIVE: 0, EXPIRED: 0, TERMINATED: 0 } as Record<Filter, number>;
    let monthly = 0;
    (data ?? []).forEach((l) => {
      s.ALL += 1;
      if (l.status in s) s[l.status as Filter] += 1;
      if (l.status === 'ACTIVE') monthly += Number(l.monthlyRent) + Number(l.foodCharge);
    });
    return { s, monthly };
  }, [data]);

  const rows = (data ?? []).filter((l) => filter === 'ALL' || l.status === filter);

  if (isLoading) return <Spinner label="Loading leases…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Active and past leases. Generate an AI plain-language summary, or terminate a tenancy."
      />

      {data?.length === 0 ? (
        <EmptyState
          icon="file"
          title="No leases yet"
          hint="A lease is created automatically when you approve an application."
        />
      ) : (
        <SplitLayout
          aside={
            <>
              <RailFilters
                title="Status"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'ALL', label: 'All', count: stats.s.ALL },
                  { value: 'ACTIVE', label: 'Active', count: stats.s.ACTIVE },
                  { value: 'EXPIRED', label: 'Expired', count: stats.s.EXPIRED },
                  { value: 'TERMINATED', label: 'Terminated', count: stats.s.TERMINATED },
                ]}
              />
              <RailStats
                title="Active leases"
                rows={[
                  { label: 'Count', value: stats.s.ACTIVE },
                  { label: 'Monthly rent roll', value: money(stats.monthly), tone: 'positive' },
                ]}
              />
            </>
          }
        >
        <div>
          {rows.map((l) => (
            <div key={l.id} className="row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{l.tenant.fullName}</p>
                  <p className="text-xs text-ink-500">
                    {l.room.property.name} · {l.room.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {date(l.startDate)} → {date(l.endDate)} · {money(l.monthlyRent)}/mo
                    {Number(l.foodCharge) > 0 && ` · +${money(l.foodCharge)} food`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
                      leaseStatus[l.status] ?? leaseStatus.EXPIRED
                    }`}
                  >
                    {l.status}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setOpen(open === l.id ? null : l.id);
                      if (!l.aiSummary) summarize.mutate(l.id);
                    }}
                  >
                    <Icon name="sparkles" size={13} />
                    {l.aiSummary ? (open === l.id ? 'Hide summary' : 'Show summary') : summarize.isPending ? 'Summarising…' : 'AI summary'}
                  </button>
                  {l.status === 'ACTIVE' && (
                    <button
                      className="btn-danger-quiet btn-sm"
                      onClick={() => terminate.mutate(l.id)}
                      disabled={terminate.isPending}
                    >
                      Terminate
                    </button>
                  )}
                </div>
              </div>
              {open === l.id && l.aiSummary && (
                <div className="mt-3 border-l-2 border-slate-200 py-1 pl-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-700">AI lease summary</span>
                    <AiSourceTag source={l.aiSummarySource} />
                  </div>
                  <p className="text-sm text-ink-600">{l.aiSummary}</p>
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <EmptyState icon="file" title="No leases with this status" />
          )}
          {(summarize.error || terminate.error) && (
            <ErrorBanner message={apiErrorMessage(summarize.error ?? terminate.error)} />
          )}
        </div>
        </SplitLayout>
      )}
    </div>
  );
}
