import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, EmptyState, ErrorBanner, PageHeader, PriorityFlag, Spinner, date } from '../../components/ui';

function Tabs({ tab, setTab }: { tab: 'active' | 'completed'; setTab: (t: 'active' | 'completed') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {(['active', 'completed'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            tab === t ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-slate-50'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  scheduledFor: string;
  status: string;
  priority: string;
  property: { name: string; addressLine1: string; city: string };
  room: { name: string } | null;
  photos: { id: string; kind: string; path: string }[];
}

const NEXT_STATUS: Record<string, string[]> = {
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

export default function StaffCleaning() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [expand, setExpand] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoKind, setPhotoKind] = useState('BEFORE');

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', 'cleaning', tab],
    queryFn: async () =>
      (await api.get(`/staff/cleaning${tab === 'completed' ? '?completed=true&status=COMPLETED' : ''}`)).data.data as Task[],
  });

  const setStatus = useMutation({
    mutationFn: async (b: { id: string; status: string }) => (await api.patch(`/staff/cleaning/${b.id}/status`, b)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', 'cleaning'] }),
  });
  const addPhoto = useMutation({
    mutationFn: async (id: string) => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Choose a photo first');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', photoKind);
      return (await api.post(`/staff/cleaning/${id}/photos`, fd)).data;
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['staff', 'cleaning'] });
    },
  });

  if (isLoading) return <Spinner label="Loading your tasks…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Cleaning tasks"
        description="Scheduled cleaning assigned to you. Mark progress and upload before/after photos."
        actions={<Tabs tab={tab} setTab={setTab} />}
      />

      <div className="space-y-2.5">
      {data?.length === 0 && (
        <EmptyState
          icon={tab === 'active' ? 'broom' : 'check'}
          title={tab === 'active' ? 'No active tasks' : 'No completed tasks'}
          hint={tab === 'active' ? 'Assigned cleaning jobs show up here.' : undefined}
        />
      )}
      {data?.map((t) => (
        <div key={t.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t.title}</p>
                <PriorityFlag value={t.priority} />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {t.property.name}{t.room ? ` / ${t.room.name}` : ''} — {t.property.addressLine1}, {t.property.city}
              </p>
              <p className="text-xs text-slate-400">{t.frequency} · scheduled {date(t.scheduledFor)}</p>
            </div>
            <Badge>{t.status}</Badge>
          </div>

          <button className="mt-2 text-sm text-brand-600" onClick={() => setExpand(expand === t.id ? null : t.id)}>
            {expand === t.id ? 'Hide' : 'Open task'}
          </button>

          {expand === t.id && (
            <div className="mt-3 space-y-3 rounded bg-slate-50 p-3 text-sm">
              {t.description && <p className="text-slate-600">{t.description}</p>}
              <div className="flex flex-wrap gap-2">
                {t.photos.map((p) => (
                  <a key={p.id} href={`/uploads/${p.path}`} target="_blank" rel="noreferrer" className="badge bg-white text-slate-500">{p.kind}</a>
                ))}
                {t.photos.length === 0 && <span className="text-xs text-slate-400">No photos yet</span>}
              </div>
              {t.status !== 'COMPLETED' && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">Update status:</span>
                    {(NEXT_STATUS[t.status] ?? []).map((s) => (
                      <button key={s} className="btn-ghost" onClick={() => setStatus.mutate({ id: t.id, status: s })} disabled={setStatus.isPending}>
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
                    <button className="btn-ghost" onClick={() => addPhoto.mutate(t.id)} disabled={addPhoto.isPending}>Upload proof</button>
                  </div>
                  <p className="text-xs text-amber-600">An AFTER photo is required to mark a task complete.</p>
                </>
              )}
              {(setStatus.error || addPhoto.error) && <ErrorBanner message={apiErrorMessage(setStatus.error ?? addPhoto.error)} />}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
