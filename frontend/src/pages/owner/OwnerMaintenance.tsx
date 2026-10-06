import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, Chip, EmptyState, ErrorBanner, FilterSelect, PageHeader, PriorityFlag, Spinner, date } from '../../components/ui';

const STATUS_OPTIONS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

interface Req {
  id: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  createdAt: string;
  room: { name: string; property: { name: string } };
  tenant: { fullName: string };
  assignedStaff: { id: string; fullName: string } | null;
  photos: { id: string; kind: string; path: string }[];
  _count: { notes: number };
}

export default function OwnerMaintenance() {
  const qc = useQueryClient();
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [expand, setExpand] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'maintenance'],
    queryFn: async () => (await api.get('/owner/maintenance')).data.data as Req[],
  });
  const staff = useQuery({
    queryKey: ['owner', 'staff', 'maint'],
    queryFn: async () => (await api.get('/owner/staff?staffType=MAINTENANCE')).data.data as { id: string; fullName: string }[],
  });

  const assign = useMutation({
    mutationFn: async (b: { id: string; staffId: string }) => (await api.post(`/owner/maintenance/${b.id}/assign`, { staffId: b.staffId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'maintenance'] }),
  });
  const update = useMutation({
    mutationFn: async (b: { id: string; priority?: string; status?: string }) => (await api.patch(`/owner/maintenance/${b.id}`, b)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'maintenance'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  const rows = (data ?? []).filter((r) => statuses.size === 0 || statuses.has(r.status));

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Requests raised by tenants. AI suggests a category and priority: assign staff and track them through."
        actions={
          <FilterSelect
            label="Status"
            options={STATUS_OPTIONS.map((v) => ({
              value: v,
              count: (data ?? []).filter((r) => r.status === v).length,
            }))}
            selected={statuses}
            onChange={setStatuses}
          />
        }
      />
      <div className="space-y-2.5">

      {rows.length === 0 && (
        <EmptyState
          icon="wrench"
          title={statuses.size ? 'No requests match this filter' : 'No maintenance requests'}
          hint={statuses.size ? 'Try removing a status from the filter.' : 'Requests raised by tenants appear here.'}
        />
      )}
      {rows.map((r) => (
        <div key={r.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">{r.title}</p>
                <PriorityFlag value={r.priority} />
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {r.room.property.name} · {r.room.name} · by {r.tenant.fullName} · {date(r.createdAt)}
              </p>
            </div>
            <Badge>{r.status}</Badge>
          </div>

          <button
            className="btn-secondary btn-sm mt-3"
            onClick={() => setExpand(expand === r.id ? null : r.id)}
          >
            {expand === r.id ? 'Hide details' : 'Details & manage'}
            <Icon name={expand === r.id ? 'chevronLeft' : 'chevronRight'} size={13} />
          </button>

          {expand === r.id && (
            <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
              {r.category && (
                <div>
                  <Chip>{r.category}</Chip>
                </div>
              )}
              <p className="text-ink-600">{r.description}</p>
              {r.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <a
                      key={p.id}
                      href={`/uploads/${p.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-2xs font-medium text-ink-600 hover:border-brand-300"
                    >
                      <Icon name="camera" size={11} />
                      {p.kind}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="label">Assign staff</label>
                  <select
                    className="input w-52"
                    value={r.assignedStaff?.id ?? ''}
                    onChange={(e) => e.target.value && assign.mutate({ id: r.id, staffId: e.target.value })}
                  >
                    <option value="">{r.assignedStaff ? r.assignedStaff.fullName : 'Unassigned'}</option>
                    {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input w-36" value={r.priority} onChange={(e) => update.mutate({ id: r.id, priority: e.target.value })}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input w-40" value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}>
                    {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {(assign.error || update.error) && <ErrorBanner message={apiErrorMessage(assign.error ?? update.error)} />}
      </div>
    </div>
  );
}
