import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import PasswordForm from '../components/PasswordForm';
import './Login.css';

export default function PasswordSetup() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.hasPassword !== false) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  return <main className="flex min-h-[100svh] items-center justify-center bg-[#f3f1e9] px-3 py-6">
    <section className="login-card !m-0 !p-6 sm:!p-10" aria-labelledby="password-setup-heading">
      <Link to="/welcome" className="login-card-wordmark">Roomora</Link>
      <h1 id="password-setup-heading" className="text-3xl font-bold tracking-tight text-[#20372d]">One last step.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">Create a backup password for your Roomora account. You can use it whenever Google sign-in is unavailable.</p>
      <p className="mb-6 mt-4 break-all rounded-lg bg-[#eaf3e7] px-3 py-2 text-sm font-semibold text-[#244431]">{user.email}</p>
      <PasswordForm mode="setup" onComplete={(updated) => { if (updated) navigate(`/${updated.role.toLowerCase()}`, { replace: true }); }} />
      <button type="button" onClick={() => void logout().then(() => navigate('/login', { replace: true }))} className="mt-5 text-xs font-semibold text-ink-600 underline underline-offset-4">Sign out and use another account</button>
    </section>
  </main>;
}
