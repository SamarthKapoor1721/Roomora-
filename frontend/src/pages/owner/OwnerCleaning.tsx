import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmDialog, EmptyState, ErrorBanner, PageHeader, Spinner, date } from '../../components/ui';

interface Task {
  id: string;
  title: string;
  frequency: string;
  scheduledFor: string;
  status: string;
  priority: string;
  property: { id: string; name: string };
  room: { id: string; name: string } | null;
  assignedStaff: { id: string; fullName: string } | null;
  photos: { id: string; kind: string; path: string }[];
}

export default function OwnerCleaning() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'cleaning'],
    queryFn: async () => (await api.get('/owner/cleaning')).data.data as Task[],
  });
  const props = useQuery({
    queryKey: ['owner', 'properties', 'brief'],
    queryFn: async () => (await api.get('/owner/properties')).data.data as { id: string; name: string }[],
  });
  const staff = useQuery({
    queryKey: ['owner', 'staff', 'clean'],
    queryFn: async () => (await api.get('/owner/staff?staffType=CLEANING')).data.data as { id: string; fullName: string }[],
  });

  const assign = useMutation({
    mutationFn: async (b: { id: string; staffId: string }) => (await api.post(`/owner/cleaning/${b.id}/assign`, { staffId: b.staffId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'cleaning'] }),
  });
  const create = useMutation({
    mutationFn: async (b: unknown) => (await api.post('/owner/cleaning', b)).data,
    onSuccess: () => {
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['owner', 'cleaning'] });
    },
  });
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/owner/cleaning/${id}`)).data,
    onSuccess: () => {
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['owner', 'cleaning'] });
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Cleaning"
        description="Schedule cleaning for a property or room, assign staff, and check the before/after proof photos."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {!showForm && <Icon name="plus" size={16} />}
            {showForm ? 'Cancel' : 'New task'}
          </button>
        }
      />

      {showForm && (
        <div className="mb-4">
          <CleaningForm properties={props.data ?? []} onSubmit={(b) => create.mutate(b)} pending={create.isPending} error={create.error} />
        </div>
      )}

      <div className="space-y-2.5">
      {data?.length === 0 && (
        <EmptyState icon="broom" title="No cleaning tasks" hint="Create a task to schedule a clean and assign it to staff." />
      )}
      {data?.map((t) => (
        <div key={t.id} className="card flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">{t.title}</p>
            <p className="text-xs text-ink-500">
              {t.property.name}
              {t.room ? ` · ${t.room.name}` : ''} · {t.frequency.toLowerCase()} · scheduled {date(t.scheduledFor)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge>{t.priority}</Badge>
              <Badge>{t.status}</Badge>
              {t.photos.map((p) => (
                <a
                  key={p.id}
                  href={`/uploads/${p.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-2xs font-medium text-ink-600 hover:border-brand-300"
                >
                  <Icon name="camera" size={11} />
                  {p.kind}
                </a>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              className="input w-48"
              value={t.assignedStaff?.id ?? ''}
              onChange={(e) => e.target.value && assign.mutate({ id: t.id, staffId: e.target.value })}
            >
              <option value="">{t.assignedStaff ? t.assignedStaff.fullName : 'Assign staff…'}</option>
              {staff.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            <button
              className="btn-ghost btn-sm text-rose-600"
              onClick={() => setToDelete(t)}
              title={t.status === 'IN_PROGRESS' ? 'Cannot delete a task in progress' : 'Delete task'}
              aria-label="Delete task"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      ))}
      {assign.error && <ErrorBanner message={apiErrorMessage(assign.error)} />}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this cleaning task?"
        message={
          <>
            <b>{toDelete?.title}</b> will be permanently removed. Blocked if the task is already in
            progress.
          </>
        }
        confirmLabel="Delete task"
        busy={del.isPending}
        error={del.error ? apiErrorMessage(del.error) : null}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => {
          setToDelete(null);
          del.reset();
        }}
      />
    </div>
  );
}

function CleaningForm({
  properties,
  onSubmit,
  pending,
  error,
}: {
  properties: { id: string; name: string }[];
  onSubmit: (b: unknown) => void;
  pending: boolean;
  error: unknown;
}) {
  const [f, setF] = useState({
    propertyId: properties[0]?.id ?? '',
    title: '',
    frequency: 'ONE_TIME',
    scheduledFor: new Date().toISOString().slice(0, 10),
    priority: 'MEDIUM',
  });
  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...f, scheduledFor: new Date(f.scheduledFor).toISOString() });
      }}
    >
      {error != null && <ErrorBanner message={apiErrorMessage(error)} />}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Property</label>
          <select className="input" value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })} required>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Frequency</label>
          <select className="input" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            {['ONE_TIME', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Scheduled for</label>
          <input className="input" type="date" value={f.scheduledFor} onChange={(e) => setF({ ...f, scheduledFor: e.target.value })} />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <button className="btn-primary" disabled={pending}>Create task</button>
    </form>
  );
}
