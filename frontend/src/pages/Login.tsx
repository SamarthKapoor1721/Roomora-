import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBanner, Field } from '../components/ui';

const demoAccounts = [
  { label: 'Owner', email: 'owner@srms.test', detail: 'Properties and applications', number: '01' },
  { label: 'Tenant', email: 'tenant2@srms.test', detail: 'Lease and payments', number: '02' },
  { label: 'New tenant', email: 'tenant@srms.test', detail: 'Browse and apply', number: '03' },
  { label: 'Maintenance', email: 'maintenance@srms.test', detail: 'Assigned repairs', number: '04' },
  { label: 'Cleaning', email: 'cleaning@srms.test', detail: 'Assigned cleaning', number: '05' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@srms.test');
  const [password, setPassword] = useState('Password123');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-[#f7f7f2] lg:grid lg:grid-cols-[minmax(0,0.93fr)_minmax(0,1.07fr)]">
      <section className="relative isolate hidden min-h-screen flex-col justify-between overflow-hidden bg-[#153d30] px-8 py-9 text-white lg:flex xl:px-14 xl:py-11" aria-label="About Roomora">
        <img src="/images/login-rental-home.jpg" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#112c23]/65 via-[#112c23]/15 to-[#10291f]/95" />
        <Link to="/" className="relative z-10 w-fit font-wordmark text-3xl font-bold tracking-tight text-white xl:text-4xl">Roomora</Link>

        <div className="relative z-10 mt-auto max-w-[620px] pb-12 pt-24">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#c5e5ad]">Rental management, connected</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.06] tracking-tight xl:text-6xl">
            Every rental has a story.<br /><span className="text-[#c5e5ad]">Keep yours moving.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 xl:text-lg">
            List rooms, review applications, manage leases and rent, and stay on top of maintenance in one workspace.
          </p>
        </div>
        <p className="relative z-10 border-t border-white/30 pt-5 text-sm text-white/80">From the first application to the everyday work of keeping a home running.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20" aria-label="Sign in">
        <div className="w-full max-w-[540px]">
          <Link to="/" className="mb-10 block w-fit font-wordmark text-3xl font-bold tracking-tight text-[#153d30] lg:hidden">Roomora</Link>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Welcome back</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">Sign in to Roomora</h2>
          <p className="mt-3 text-base text-ink-500">Pick a demo workspace or use your own account.</p>

          <form onSubmit={submit} className="mt-9 space-y-5">
            {error && <ErrorBanner message={error} />}
            <Field label="Email address">
              <input className="input h-12 bg-white text-base" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input className="input h-12 bg-white pr-20 text-base" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 px-2 text-sm font-medium text-brand-700 hover:text-brand-800">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <button className="btn-primary flex h-12 w-full items-center justify-center gap-3 text-base" disabled={busy}>
              {busy ? 'Signing in…' : 'Enter workspace'}<span aria-hidden="true">↗</span>
            </button>
          </form>

          <p className="mt-5 text-sm text-ink-500">New to Roomora? <Link to="/register" className="font-semibold text-brand-700 underline-offset-4 hover:underline">Create an account</Link></p>

          <div className="mt-9 border-t border-slate-300 pt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-ink-900">Explore a workspace</h3>
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-ink-400">Demo access</span>
            </div>
            <p className="mt-1 text-sm text-ink-500">Select a role to fill in its demo credentials.</p>
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  aria-pressed={email === account.email && password === 'Password123'}
                  className={`group grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_1rem] ${email === account.email && password === 'Password123' ? 'text-brand-700' : 'text-ink-800'}`}
                  onClick={() => { setEmail(account.email); setPassword('Password123'); setError(''); }}
                >
                  <span className="font-mono text-xs text-brand-600">{account.number}</span>
                  <span className="font-medium">{account.label}</span>
                  <span className="hidden text-sm text-ink-500 sm:block">{account.detail}</span>
                  <span className="text-lg leading-none text-brand-600 transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-ink-400">All demo roles use Password123</p>
          </div>
        </div>
      </section>
    </main>
  );
}
