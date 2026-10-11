import { useState } from 'react';
import { api, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import GoogleSignIn from '../components/GoogleSignIn';
import { ErrorBanner } from '../components/ui';
import PasswordForm from '../components/PasswordForm';

export default function Account() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(!!user?.googleConnected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const link = async (credential: string) => {
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/google/link', { credential });
      setConnected(true);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6 pb-12">
    <div><p className="font-mono text-xs font-semibold uppercase tracking-[.2em] text-brand-700">Your account</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink-900">Sign-in & profile</h1><p className="mt-2 text-sm text-ink-500">Manage how you access your Roomora workspace.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-ink-900">Profile</h2>
      <dl className="mt-5 divide-y divide-slate-100 text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Name</dt><dd className="font-medium text-ink-900">{user?.fullName}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Email</dt><dd className="break-all text-right font-medium text-ink-900">{user?.email}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Workspace</dt><dd className="font-medium capitalize text-ink-900">{user?.role.toLowerCase().replace('_', ' ')}</dd></div></dl>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-ink-900">{user?.hasPassword === false ? 'Set a password' : 'Change password'}</h2>
      <p className="mb-5 mt-2 text-sm text-ink-600">Use your email and password whenever Google sign-in is unavailable.</p>
      <PasswordForm mode={user?.hasPassword === false ? 'setup' : 'change'} />
    </section>
    <section className="rounded-2xl border border-[#dfe7da] bg-[#f9fbf6] p-6 shadow-sm">
      <p className="font-mono text-[.65rem] font-semibold uppercase tracking-[.18em] text-brand-700">Secure access</p><h2 className="mt-2 font-display text-xl font-semibold text-ink-900">Google sign-in</h2>
      {connected ? <p className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-700"><span aria-hidden="true">✓</span> Connected to this email address</p> : <><p className="mt-3 text-sm leading-relaxed text-ink-500">Connect the Google account with the same email address. Then you can use Google next time you sign in.</p><div className="mt-5">{error && <div className="mb-4"><ErrorBanner message={error} /></div>}<GoogleSignIn onCredential={link} disabled={busy} /></div></>}
    </section>
  </div>;
}
