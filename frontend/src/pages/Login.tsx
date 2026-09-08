import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBanner, Field } from '../components/ui';
import { Icon } from '../components/Icon';

const demoAccounts: [string, string, string][] = [
  ['Owner', 'owner@srms.test', 'Manage properties, applications, rent, staff'],
  ['Tenant', 'tenant2@srms.test', 'Assigned to a room, has an overdue invoice'],
  ['Tenant (new)', 'tenant@srms.test', 'No room yet — can browse and apply'],
  ['Maintenance staff', 'maintenance@srms.test', 'Assigned maintenance tasks'],
  ['Cleaning staff', 'cleaning@srms.test', 'Assigned cleaning tasks'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@srms.test');
  const [password, setPassword] = useState('Password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      navigate(`/${u.role.toLowerCase()}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* left: brand panel */}
      <div className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
            R
          </span>
          <span className="font-display text-base font-semibold">Roomora</span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight">
            One calm place for properties, tenants and rent.
          </h1>
          <p className="mt-3 max-w-md text-sm text-brand-100">
            Applications with AI-assisted screening (advisory only — you always decide),
            leases, payments, maintenance, cleaning and automatic warnings.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-brand-100">
            {['Owner, tenant and staff workspaces', 'AI screening with a rule-based fallback', 'Automatic rent & maintenance warnings'].map(
              (f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/40">
                    <Icon name="check" size={12} />
                  </span>
                  {f}
                </li>
              ),
            )}
          </ul>
        </div>
        <p className="text-xs text-brand-200">Demo environment · seeded data</p>
      </div>

      {/* right: form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              R
            </span>
            <span className="font-display text-lg font-semibold text-ink-900">Roomora</span>
          </div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Use a demo account below, or your own credentials.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && <ErrorBanner message={error} />}
            <Field label="Email">
              <input
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            No account?{' '}
            <Link to="/register" className="font-medium text-brand-600">
              Register
            </Link>
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">
              Demo accounts · password Password123
            </p>
            <div className="space-y-1">
              {demoAccounts.map(([label, mail, desc]) => (
                <button
                  key={mail}
                  className="group flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                  onClick={() => {
                    setEmail(mail);
                    setPassword('Password123');
                  }}
                >
                  <span className="mt-0.5 text-sm font-medium text-ink-800">{label}</span>
                  <span className="ml-auto text-xs text-ink-400 group-hover:text-ink-600">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
