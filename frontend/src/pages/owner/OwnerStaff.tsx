import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, Chip, EmptyState, ErrorBanner, PageHeader, Spinner } from '../../components/ui';

interface Staff {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  staffType: string;
  skills: string[];
  isActive: boolean;
  openMaintenance: number;
  openCleaning: number;
}

export default function OwnerStaff() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'staff', 'all'],
    queryFn: async () => (await api.get('/owner/staff')).data.data as Staff[],
  });

  const create = useMutation({
    mutationFn: async (b: unknown) => (await api.post('/owner/staff', b)).data,
    onSuccess: () => {
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['owner', 'staff'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/owner/staff/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'staff'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Your maintenance and cleaning team. Staff sign in to see only the tasks assigned to them."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {!showForm && <Icon name="plus" size={16} />}
            {showForm ? 'Cancel' : 'Add staff'}
          </button>
        }
      />

      {showForm && (
        <div className="mb-4">
          <StaffForm onSubmit={(b) => create.mutate(b)} pending={create.isPending} error={create.error} />
        </div>
      )}

      {data?.length === 0 ? (
        <EmptyState
          icon="users"
          title="No staff yet"
          hint="Add maintenance and cleaning staff so you can assign work to them."
        />
      ) : (
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {data?.map((s) => (
            <div key={s.id} className="border-b border-slate-100 pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-ink-600">
                    {s.fullName.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{s.fullName}</p>
                    <p className="text-xs text-ink-500">
                      {s.email} · {s.phone ?? 'no phone'}
                    </p>
                  </div>
                </div>
                <Badge>{s.staffType}</Badge>
              </div>

              {s.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.skills.map((k) => (
                    <Chip key={k}>{k}</Chip>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-ink-500">
                  {s.openMaintenance} open maintenance · {s.openCleaning} open cleaning
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
                      s.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : 'bg-slate-100 text-ink-500 ring-slate-500/20'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {s.isActive && (
                    <button
                      className="btn-danger-quiet btn-sm"
                      onClick={() => deactivate.mutate(s.id)}
                      disabled={deactivate.isPending}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {deactivate.error && <ErrorBanner message={apiErrorMessage(deactivate.error)} />}
    </div>
  );
}

function StaffForm({ onSubmit, pending, error }: { onSubmit: (b: unknown) => void; pending: boolean; error: unknown }) {
  const [f, setF] = useState({
    fullName: '',
    email: '',
    password: 'Password123',
    phone: '',
    staffType: 'MAINTENANCE',
    skills: '',
  });
  return (
    <form
      className="space-y-3 border-l-2 border-brand-200 py-1 pl-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...f,
          skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
        });
      }}
    >
      {error != null && <ErrorBanner message={apiErrorMessage(error)} />}
      <div className="grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required />
        <input className="input" placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className="input" placeholder="Temp password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <input className="input" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className="input" value={f.staffType} onChange={(e) => setF({ ...f, staffType: e.target.value })}>
          {['MAINTENANCE', 'CLEANING', 'GENERAL'].map((x) => <option key={x}>{x}</option>)}
        </select>
        <input className="input" placeholder="Skills (comma-separated)" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} />
      </div>
      <button className="btn-primary" disabled={pending}>Create staff account</button>
    </form>
  );
}
