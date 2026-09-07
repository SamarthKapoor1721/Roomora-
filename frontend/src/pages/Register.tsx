import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBanner, Field } from '../components/ui';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'TENANT' as 'TENANT' | 'OWNER',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await register(form);
      navigate(`/${u.role.toLowerCase()}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
            R
          </span>
          <span className="font-display text-lg font-semibold text-ink-900">Roomora</span>
          <p className="mt-1 text-sm text-ink-500">Create your account</p>
        </div>
        <form onSubmit={submit} className="card card-pad space-y-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Full name">
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password" hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number.">
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="I am a" hint="Staff accounts are created by property owners.">
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'TENANT' | 'OWNER' })}
            >
              <option value="TENANT">Tenant — looking for a room</option>
              <option value="OWNER">Property owner — managing rentals</option>
            </select>
          </Field>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-500">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
