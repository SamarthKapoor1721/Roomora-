import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { AiSourceTag, Badge, EmptyState, ErrorBanner, PageHeader, PriorityFlag, Spinner, date } from '../../components/ui';

interface Req {
  id: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  aiSource: string | null;
  createdAt: string;
  room: { name: string };
  assignedStaff: { fullName: string } | null;
  photos: { id: string; kind: string; path: string }[];
  notes?: { id: string; body: string; createdAt: string }[];
}

export default function TenantMaintenance() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expand, setExpand] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'maintenance'],
    queryFn: async () => (await api.get('/tenant/maintenance')).data.data as Req[],
  });

  const create = useMutation({
    mutationFn: async (b: { title: string; description: string }) => (await api.post('/tenant/maintenance', b)).data.data,
    onSuccess: () => {
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['tenant', 'maintenance'] });
    },
  });
  const addPhoto = useMutation({
    mutationFn: async (reqId: string) => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Choose a photo first');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'ISSUE');
      return (await api.post(`/maintenance/${reqId}/photos`, fd)).data;
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['tenant', 'maintenance'] });
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Report anything that needs fixing in your room. AI tags it, and staff handle it with before/after photos."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {!showForm && <Icon name="plus" size={16} />}
            {showForm ? 'Cancel' : 'Raise request'}
          </button>
        }
      />

      {showForm && (
        <div className="mb-4">
          <RaiseForm onSubmit={(b) => create.mutate(b)} pending={create.isPending} error={create.error} />
        </div>
      )}

      <div className="space-y-2.5">
      {data?.length === 0 && (
        <EmptyState icon="wrench" title="No maintenance requests" hint="Raise one if something in your room needs fixing." />
      )}
      {data?.map((r) => (
        <div key={r.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{r.title}</p>
                <PriorityFlag value={r.priority} />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{r.room.name} · {date(r.createdAt)} {r.assignedStaff && `· ${r.assignedStaff.fullName}`}</p>
            </div>
            <Badge>{r.status}</Badge>
          </div>
          <button className="mt-2 text-sm text-brand-600" onClick={() => setExpand(expand === r.id ? null : r.id)}>
            {expand === r.id ? 'Hide' : 'Details'}
          </button>
          {expand === r.id && (
            <div className="mt-3 space-y-3 rounded bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {r.category && <span className="badge">{r.category}</span>}
                <AiSourceTag source={r.aiSource} />
              </div>
              <p className="text-slate-600">{r.description}</p>
              {r.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <a key={p.id} href={`/uploads/${p.path}`} target="_blank" rel="noreferrer" className="badge bg-white text-slate-500">{p.kind}</a>
                  ))}
                </div>
              )}
              {r.notes && r.notes.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-500">
                  {r.notes.map((n) => <li key={n.id}>{date(n.createdAt)}: {n.body}</li>)}
                </ul>
              )}
              {!['COMPLETED', 'CANCELLED'].includes(r.status) && (
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="text-xs" />
                  <button className="btn-ghost" onClick={() => addPhoto.mutate(r.id)} disabled={addPhoto.isPending}>Add photo</button>
                </div>
              )}
              {addPhoto.error && <ErrorBanner message={apiErrorMessage(addPhoto.error)} />}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

function RaiseForm({ onSubmit, pending, error }: { onSubmit: (b: { title: string; description: string }) => void; pending: boolean; error: unknown }) {
  const [f, setF] = useState({ title: '', description: '' });
  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
    >
      {error != null && <ErrorBanner message={apiErrorMessage(error)} />}
      <input className="input" placeholder="Short title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      <textarea className="input" rows={3} placeholder="Describe the issue in detail" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required />
      <p className="text-xs text-slate-400">AI will suggest a category and priority. You can add photos after submitting.</p>
      <button className="btn-primary" disabled={pending}>Submit request</button>
    </form>
  );
}
