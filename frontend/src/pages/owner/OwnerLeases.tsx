import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { AiSourceTag, EmptyState, ErrorBanner, PageHeader, Spinner, money, date } from '../../components/ui';

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

export default function OwnerLeases() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
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

  if (isLoading) return <Spinner label="Loading leases…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  const leaseStatus: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    EXPIRED: 'bg-slate-100 text-ink-600 ring-slate-500/20',
    TERMINATED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };

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
        <div className="space-y-3">
          {data?.map((l) => (
            <div key={l.id} className="card">
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
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-700">AI lease summary</span>
                    <AiSourceTag source={l.aiSummarySource} />
                  </div>
                  <p className="text-sm text-ink-600">{l.aiSummary}</p>
                </div>
              )}
            </div>
          ))}
          {(summarize.error || terminate.error) && (
            <ErrorBanner message={apiErrorMessage(summarize.error ?? terminate.error)} />
          )}
        </div>
      )}
    </div>
  );
}
