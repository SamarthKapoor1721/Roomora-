import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ErrorBanner, Spinner } from '../../components/ui';
import AdminUserDialog, { type AdminUser } from './AdminUserDialog';

type Role = 'SUPER_ADMIN' | 'OWNER' | 'TENANT' | 'STAFF';
type Overview = { counts: { users: number; owners: number; tenants: number; staff: number; active: number; properties: number; rooms: number; applications: number }; integrations: { google: boolean; ai: boolean }; recent: { id: string; action: string; createdAt: string; actor: { fullName: string } | null }[] };
type UserList = { users: AdminUser[]; total: number; page: number; pageSize: number };

const roles: { value: Role | ''; label: string }[] = [
  { value: '', label: 'All people' }, { value: 'OWNER', label: 'Property owners' },
  { value: 'TENANT', label: 'Tenants' }, { value: 'STAFF', label: 'Staff' },
  { value: 'SUPER_ADMIN', label: 'Admins' },
];

export default function AdminPortal() {
  const { user: currentUser } = useAuth();
  const client = useQueryClient();
  const [role, setRole] = useState<Role | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit' | 'delete' | 'reset'; user?: AdminUser } | null>(null);
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await api.get('/admin/overview')).data.data as Overview });
  const people = useQuery({ queryKey: ['admin', 'users', role, search, page], queryFn: async () => (await api.get('/admin/users', { params: { role: role || undefined, q: search || undefined, page } })).data.data as UserList });
  const status = useMutation({ mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/users/${id}/status`, { isActive }), onSuccess: () => { setError(''); void client.invalidateQueries({ queryKey: ['admin'] }); }, onError: (err) => setError(apiErrorMessage(err)) });
  const counts = overview.data?.counts;

  return <div className="space-y-8 pb-16">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[#153d30] px-6 py-8 text-white shadow-[0_24px_65px_rgba(21,61,48,.16)] sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[46px] border-[#b6df9a]/10" />
      <div className="pointer-events-none absolute -bottom-36 right-28 h-72 w-72 rounded-full border border-white/10" />
      <div className="relative grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
        <div><p className="font-mono text-xs font-semibold uppercase tracking-[.22em] text-[#b6df9a]">Roomora / Control room</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your whole platform,<br /><span className="text-[#b6df9a]">in one view.</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70">Manage access, see who is using Roomora, and keep an eye on system activity.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <p className="font-mono text-[.65rem] uppercase tracking-[.2em] text-[#b6df9a]">Signed in as</p>
          <p className="mt-2 font-display text-2xl font-semibold">{currentUser?.fullName}</p>
          <p className="mt-1 break-all text-sm text-white/65">{currentUser?.email}</p>
        </div>
      </div>
    </section>

    {error && <ErrorBanner message={error} />}
    {overview.isError && <ErrorBanner message={apiErrorMessage(overview.error)} />}
    {people.isError && <ErrorBanner message={apiErrorMessage(people.error)} />}
    {!counts && overview.isLoading ? <Spinner /> : <>
      <section aria-label="Platform overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([['People', counts?.users], ['Property owners', counts?.owners], ['Properties', counts?.properties], ['Applications', counts?.applications]] as const).map(([label, value], index) =>
          <div key={label} className="rounded-2xl border border-[#dfe7da] bg-[#f9fbf6] p-5 shadow-sm">
            <span className="font-mono text-[.65rem] font-semibold uppercase tracking-[.17em] text-[#65806d]">0{index + 1} / {label}</span>
            <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-[#163d31]">{value ?? '—'}</p>
            <span className="mt-3 block h-1 w-10 rounded-full bg-[#a8db8b]" />
          </div>)}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="User management">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.2em] text-brand-700">Access management</p><h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">People & owners</h2><span className="text-sm text-ink-500">{people.data?.total ?? 0} accounts</span></div><button type="button" className="btn-primary" onClick={() => setDialog({ mode: 'create' })}>+ Add user</button></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input aria-label="Search users" className="input flex-1" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              <select aria-label="Filter by role" className="input sm:w-44" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }}>{roles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {people.isLoading && <div className="p-8"><Spinner /></div>}
            {people.data?.users.length === 0 && <p className="p-8 text-center text-sm text-ink-500">{role === 'OWNER' && !search ? 'No property owners yet.' : 'No accounts match this search.'}</p>}
            {people.data?.users.map((person) => <div key={person.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#f8faf6] sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f2df] font-display text-sm font-bold text-[#28543a]">{person.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-900">{person.fullName}</p><p className="truncate text-xs text-ink-500">{person.email}</p></div>
              <div className="hidden text-right xl:block"><p className="text-xs font-medium text-ink-700">{person.role === 'OWNER' ? `${person._count.properties} properties` : person.role === 'TENANT' ? `${person._count.applications} applications` : person.signInMethod}</p><p className="mt-1 text-xs text-ink-400">Joined {new Date(person.createdAt).toLocaleDateString()}</p></div>
              <span className="rounded-full bg-[#eff3ec] px-2.5 py-1 font-mono text-[.65rem] font-semibold uppercase tracking-wider text-[#47624c]">{person.role.replace('_', ' ')}</span>
              {person.role === 'TENANT' && <span className="text-xs font-medium text-ink-500">{person._count.tenancies ? 'Allocated' : 'Fresh tenant'}</span>}
              {person.role !== 'SUPER_ADMIN' && <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-slate-50" onClick={() => setDialog({ mode: 'edit', user: person })}>Edit</button>
                {person.role === 'TENANT' && person._count.tenancies > 0 && <button type="button" className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50" onClick={() => setDialog({ mode: 'reset', user: person })}>Make fresh</button>}
                <button type="button" disabled={status.isPending} onClick={() => status.mutate({ id: person.id, isActive: !person.isActive })} className={`min-w-[86px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${person.isActive ? 'border-slate-200 text-ink-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700' : 'border-[#b6df9a] bg-[#eff8e9] text-[#28543a] hover:bg-[#dff0d3]'}`}>{person.isActive ? 'Deactivate' : 'Reactivate'}</button>
                <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setDialog({ mode: 'delete', user: person })}>Delete</button>
              </div>}
            </div>)}
          </div>
          {!!people.data?.total && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-ink-500 sm:px-6"><span>Page {page} of {Math.ceil(people.data.total / people.data.pageSize)}</span><div className="flex gap-2"><button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn-secondary btn-sm" disabled={page * people.data.pageSize >= people.data.total} onClick={() => setPage(page + 1)}>Next</button></div></div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe7da] bg-[#f9fbf6] p-5"><p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.18em] text-brand-700">Platform pulse</p><h2 className="mt-2 font-display text-xl font-semibold text-ink-900">Operations</h2><dl className="mt-5 space-y-3 text-sm">{([['Active accounts', counts?.active], ['Property owners', counts?.owners], ['Tenants', counts?.tenants], ['Staff members', counts?.staff], ['Rooms', counts?.rooms]] as [string, number | undefined][]).map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#e1e8dd] pb-2"><dt className="text-ink-500">{label}</dt><dd className="font-semibold text-ink-900">{value ?? '—'}</dd></div>)}</dl></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.18em] text-brand-700">Connections</p><h2 className="mt-2 font-display text-xl font-semibold text-ink-900">Integrations</h2><div className="mt-4 space-y-3 text-sm">{([['Google sign-in', overview.data?.integrations.google, 'Configured', 'Setup needed'], ['AI service', overview.data?.integrations.ai, 'Online', 'Offline']] as [string, boolean | undefined, string, string][]).map(([label, ready, yes, no]) => <div key={label} className="flex items-center justify-between gap-2"><span className="text-ink-700">{label}</span><span className={ready ? 'text-brand-700' : 'text-amber-700'}>{ready ? yes : no}</span></div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.18em] text-brand-700">Audit trail</p><h2 className="mt-2 font-display text-xl font-semibold text-ink-900">Recent activity</h2><div className="mt-4 space-y-3">{overview.data?.recent.length ? overview.data.recent.map((event) => <div key={event.id} className="border-l-2 border-[#b6df9a] pl-3"><p className="break-words text-xs font-medium text-ink-800">{event.action.replaceAll('.', ' ')}</p><p className="mt-1 text-[.7rem] text-ink-400">{event.actor?.fullName ?? 'System'} · {new Date(event.createdAt).toLocaleString()}</p></div>) : <p className="text-sm text-ink-500">No activity yet.</p>}</div></section>
        </aside>
      </div>
    </>}
    {dialog && <AdminUserDialog mode={dialog.mode} user={dialog.user} onClose={() => setDialog(null)} onSaved={() => { if (dialog.mode === 'create') { setRole(''); setSearch(''); } setDialog(null); setPage(1); setError(''); void client.invalidateQueries({ queryKey: ['admin'] }); }} />}
  </div>;
}
