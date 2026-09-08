import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, EmptyState, ErrorBanner, PageHeader, Spinner, date } from '../../components/ui';

function Tabs({ tab, setTab }: { tab: 'active' | 'completed'; setTab: (t: 'active' | 'completed') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {(['active', 'completed'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            tab === t ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-slate-50'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

interface Req {
  id: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  createdAt: string;
  room: { name: string; property: { name: string; addressLine1: string; city: string } };
  tenant: { fullName: string; phone: string | null };
  photos: { id: string; kind: string; path: string }[];
  notes: { id: string; body: string; createdAt: string }[];
}

const NEXT_STATUS: Record<string, string[]> = {
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD: ['IN_PROGRESS'],
};

export default function StaffMaintenance() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [expand, setExpand] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoKind, setPhotoKind] = useState('BEFORE');
  const [note, setNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', 'maintenance', tab],
    queryFn: async () =>
      (await api.get(`/staff/maintenance${tab === 'completed' ? '?completed=true&status=COMPLETED' : ''}`)).data.data as Req[],
  });

  const setStatus = useMutation({
    mutationFn: async (b: { id: string; status: string }) => (await api.patch(`/staff/maintenance/${b.id}/status`, b)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', 'maintenance'] }),
  });
  const addPhoto = useMutation({
    mutationFn: async (id: string) => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Choose a photo first');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', photoKind);
      return (await api.post(`/maintenance/${id}/photos`, fd)).data;
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['staff', 'maintenance'] });
    },
  });
  const addNote = useMutation({
    mutationFn: async (id: string) => (await api.post(`/maintenance/${id}/notes`, { body: note })).data,
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['staff', 'maintenance'] });
    },
  });

  if (isLoading) return <Spinner label="Loading your tasks…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Maintenance tasks"
        description="Work assigned to you. Update the status and upload before/after photos as you go."
        actions={<Tabs tab={tab} setTab={setTab} />}
      />

      <div>
      {data?.length === 0 && (
        <EmptyState
          icon={tab === 'active' ? 'wrench' : 'check'}
          title={tab === 'active' ? 'No active tasks' : 'No completed tasks'}
          hint={tab === 'active' ? 'When an owner assigns you a job, it shows up here.' : undefined}
        />
      )}
      {data?.map((r) => (
        <div key={r.id} className="row">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">{r.title}</p>
              <p className="text-xs text-ink-500">
                {r.room.property.name} / {r.room.name} — {r.room.property.addressLine1}, {r.room.property.city}
              </p>
              <p className="text-xs text-ink-500">Tenant: {r.tenant.fullName} {r.tenant.phone && `· ${r.tenant.phone}`} · {date(r.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{r.priority}</Badge>
              {r.category && <span className="badge">{r.category}</span>}
              <Badge>{r.status}</Badge>
            </div>
          </div>

          <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => setExpand(expand === r.id ? null : r.id)}>
            {expand === r.id ? 'Hide' : 'Open task'}
          </button>

          {expand === r.id && (
            <div className="mt-3 space-y-3 border-l-2 border-slate-200 py-1 pl-4 text-sm">
              <p className="text-ink-600">{r.description}</p>

              <div className="flex flex-wrap gap-2">
                {r.photos.map((p) => (
                  <a key={p.id} href={`/uploads/${p.path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-2xs font-medium text-ink-600 hover:border-brand-400">{p.kind}</a>
                ))}
                {r.photos.length === 0 && <span className="text-xs text-ink-400">No photos yet</span>}
              </div>

              {r.status !== 'COMPLETED' && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink-400">Update status:</span>
                    {(NEXT_STATUS[r.status] ?? []).map((s) => (
                      <button key={s} className="btn-ghost" onClick={() => setStatus.mutate({ id: r.id, status: s })} disabled={setStatus.isPending}>
                        {s.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="input w-32" value={photoKind} onChange={(e) => setPhotoKind(e.target.value)}>
                      <option value="BEFORE">BEFORE</option>
                      <option value="AFTER">AFTER</option>
                    </select>
                    <input ref={fileRef} type="file" accept="image/*" className="text-xs" />
                    <button className="btn-ghost" onClick={() => addPhoto.mutate(r.id)} disabled={addPhoto.isPending}>Upload proof</button>
                  </div>
                  <p className="text-xs text-amber-600">An AFTER photo is required to mark a task complete.</p>
                  <div className="flex gap-2">
                    <input className="input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button className="btn-ghost" onClick={() => addNote.mutate(r.id)} disabled={addNote.isPending || !note.trim()}>Note</button>
                  </div>
                </>
              )}

              {r.notes.length > 0 && (
                <ul className="space-y-1 text-xs text-ink-500">
                  {r.notes.map((n) => <li key={n.id}>{date(n.createdAt)}: {n.body}</li>)}
                </ul>
              )}
              {(setStatus.error || addPhoto.error || addNote.error) && (
                <ErrorBanner message={apiErrorMessage(setStatus.error ?? addPhoto.error ?? addNote.error)} />
              )}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
