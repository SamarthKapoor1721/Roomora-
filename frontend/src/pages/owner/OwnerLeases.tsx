import { useState } from 'react';
import TenancyRequests from '../../components/TenancyRequests';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, EmptyState, ErrorBanner, PageHeader, Spinner, money, date } from '../../components/ui';

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

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Active and past leases. Generate an AI plain-language summary, or terminate a tenancy."
      />

      <TenancyRequests owner />
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
                  <Badge>{l.status}</Badge>
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
                  <div className="mb-1">
                    <span className="text-xs font-semibold text-ink-700">AI lease summary</span>
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
