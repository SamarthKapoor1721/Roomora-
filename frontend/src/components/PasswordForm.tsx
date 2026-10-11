import { useState } from 'react';
import { api, apiErrorMessage } from '../lib/api';
import { useAuth, type User } from '../lib/auth';
import { ErrorBanner } from './ui';
import '../pages/Login.css';

export default function PasswordForm({ mode, onComplete }: { mode: 'setup' | 'change'; onComplete?: (user?: User) => void }) {
  const { setPassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, updatePassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSaved(false);
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'setup') {
        const user = await setPassword(password);
        onComplete?.(user);
      } else {
        await api.post('/auth/change-password', { currentPassword: current, newPassword: password });
        setCurrent(''); updatePassword(''); setConfirm('');
        onComplete?.();
      }
      setSaved(true);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="login-form">
    {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
    {saved && <p role="status" className="mb-4 text-sm font-medium text-brand-700">Password saved. You can now sign in with your email and password.</p>}
    {mode === 'change' && <>
      <label className="login-label" htmlFor="account-current-password">Current password</label>
      <input id="account-current-password" className="login-input mb-4" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} required />
    </>}
    <label className="login-label" htmlFor="account-new-password">{mode === 'setup' ? 'Create a password' : 'New password'}</label>
    <div className="login-password-wrap">
      <input id="account-new-password" className="login-input" type={show ? 'text' : 'password'} autoComplete="new-password" aria-describedby="account-password-rules" minLength={8} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Use at least 8 characters, uppercase and lowercase letters, and a number." value={password} onChange={(e) => updatePassword(e.target.value)} disabled={busy} required />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
    </div>
    <p id="account-password-rules" className="mt-2 text-xs text-ink-600">8+ characters, uppercase and lowercase letters, and a number.</p>
    <label className="login-label mt-4" htmlFor="account-confirm-password">Confirm password</label>
    <input id="account-confirm-password" className="login-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} required />
    <button className="login-submit" disabled={busy}><span>{busy ? 'Saving password…' : mode === 'setup' ? 'Save & enter workspace' : 'Update password'}</span><span aria-hidden="true">↗</span></button>
  </form>;
}
