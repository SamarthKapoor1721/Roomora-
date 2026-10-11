import { useState, type FormEvent } from 'react';
import ModalOverlay from '../../components/ModalOverlay';
import { ErrorBanner, Field } from '../../components/ui';
import { api, apiErrorMessage } from '../../lib/api';

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'OWNER' | 'TENANT' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  signInMethod: string;
  _count: { properties: number; applications: number; ownedStaff: number };
};

type Props = {
  mode: 'create' | 'edit' | 'delete';
  user?: AdminUser;
  onClose: () => void;
  onSaved: () => void;
};

export default function AdminUserDialog({ mode, user, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: user?.role ?? 'OWNER',
    password: '',
  });
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = mode === 'create' ? 'Add a user' : mode === 'edit' ? 'Edit user' : 'Delete user';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') {
        await api.post('/admin/users', { fullName: form.fullName, email: form.email, phone: form.phone || undefined, role: form.role, password: form.password });
      } else if (mode === 'edit' && user) {
        await api.patch(`/admin/users/${user.id}`, { fullName: form.fullName, email: form.email, phone: form.phone, role: form.role });
      } else if (user) {
        await api.delete(`/admin/users/${user.id}`, { data: { confirmEmail: confirmation } });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return <ModalOverlay labelledBy="admin-user-dialog-title" onClose={onClose}>
    <div className="my-auto w-full max-w-lg rounded-[1.5rem] border border-[#dfe7da] bg-white p-6 shadow-[0_28px_80px_rgba(20,48,31,.2)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.2em] text-brand-700">Access management</p><h2 id="admin-user-dialog-title" className="mt-2 font-display text-3xl font-semibold text-ink-900">{title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-xl text-ink-400 hover:bg-slate-100 hover:text-ink-900">×</button>
      </div>
      {mode === 'delete' ? <p className="mt-4 text-sm leading-relaxed text-ink-500">Permanently remove <strong className="text-ink-900">{user?.fullName}</strong>. Accounts with properties, leases, applications, or tasks must be deactivated to preserve those records.</p>
        : <p className="mt-3 text-sm leading-relaxed text-ink-500">{mode === 'create' ? 'Create a property owner or tenant account. Share the temporary password privately.' : 'Update this account’s contact details and role.'}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        {mode === 'delete' ? <Field label="Type the email address to confirm"><input className="input" type="email" autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={user?.email} required /></Field> : <>
          <Field label="Full name"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} minLength={2} maxLength={120} required /></Field>
          <Field label="Email address"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={mode === 'edit' && user?.signInMethod === 'Google'} required /></Field>
          <Field label="Phone (optional)"><input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminUser['role'] })} disabled={mode === 'edit' && user?.role === 'STAFF'}><option value="OWNER">Property owner</option><option value="TENANT">Tenant</option>{mode === 'edit' && user?.role === 'STAFF' && <option value="STAFF">Staff</option>}</select></Field>
          {mode === 'create' && <Field label="Temporary password" hint="At least 8 characters with uppercase, lowercase, and a number."><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></Field>}
        </>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" disabled={busy || (mode === 'delete' && confirmation.trim().toLowerCase() !== user?.email)} className={mode === 'delete' ? 'rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50' : 'btn-primary'}>{busy ? 'Saving…' : mode === 'create' ? 'Create account' : mode === 'edit' ? 'Save changes' : 'Delete user'}</button></div>
      </form>
    </div>
  </ModalOverlay>;
}
