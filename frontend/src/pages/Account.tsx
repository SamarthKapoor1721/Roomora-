import { useEffect, useState, type FormEvent } from 'react';
import { api, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import GoogleSignIn from '../components/GoogleSignIn';
import { ErrorBanner } from '../components/ui';
import PasswordForm from '../components/PasswordForm';

export default function Account() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.fullName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [connected, setConnected] = useState(!!user?.googleConnected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setName(user?.fullName ?? ''); }, [user?.fullName]);
  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    const fullName = name.trim();
    setNameError('');
    setNameSaved(false);
    if (fullName.length < 2 || fullName.length > 120) {
      setNameError('Enter a name between 2 and 120 characters.');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(fullName);
      setName(fullName);
      setNameSaved(true);
    } catch (err) { setNameError(apiErrorMessage(err)); }
    finally { setSavingName(false); }
  };
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
    <section data-tour="account-profile" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-ink-900">Profile</h2>
      <form onSubmit={saveName} className="mt-5 border-b border-slate-100 pb-5">
        <label htmlFor="account-full-name" className="block text-sm font-semibold text-[#425747]">Full name</label>
        <p id="account-name-help" className="mt-1 text-xs leading-relaxed text-ink-500">Your name appears on applications and is compared with proof documents during screening.</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input id="account-full-name" className="input min-w-0 flex-1" type="text" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setNameSaved(false); }} minLength={2} maxLength={120} aria-describedby="account-name-help" disabled={savingName} required />
          <button type="submit" className="btn-primary justify-center sm:shrink-0" disabled={savingName || name.trim() === user?.fullName}>{savingName ? 'Saving…' : 'Save name'}</button>
        </div>
        {nameError && <div className="mt-3"><ErrorBanner message={nameError} /></div>}
        {nameSaved && <p role="status" className="mt-3 text-sm font-medium text-brand-700">Name updated.</p>}
      </form>
      <dl className="divide-y divide-slate-100 text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Email</dt><dd className="break-all text-right font-medium text-ink-900">{user?.email}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Workspace</dt><dd className="font-medium capitalize text-ink-900">{user?.role.toLowerCase().replace('_', ' ')}</dd></div></dl>
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
