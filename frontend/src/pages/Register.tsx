import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, warmApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBanner } from '../components/ui';
import GoogleSignIn from '../components/GoogleSignIn';
import { Icon } from '../components/Icon';
import './Login.css';
import './Register.css';

export default function Register() {
  const { user, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: (searchParams.get('role') === 'OWNER' ? 'OWNER' : 'TENANT') as 'TENANT' | 'OWNER',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { warmApi(); }, []);

  const chooseRole = (role: 'TENANT' | 'OWNER') => {
    setForm((current) => ({ ...current, role }));
    setSearchParams({ role }, { replace: true });
    setError('');
  };

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

  const signUpWithGoogle = async (credential: string) => {
    setBusy(true);
    setError('');
    try {
      const u = await googleLogin(credential, form.role);
      navigate(`/${u.role.toLowerCase()}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell register-shell">
      <section className="login-story" aria-label="Welcome to Roomora">
        <img className="login-story-image" src="/images/login-rental-home.jpg" alt="A sunlit home with two people reviewing rental documents" />
        <div className="login-story-shade" />
        <div className="login-story-top">
          <Link to="/welcome" className="login-wordmark">Roomora</Link>
          <span className="login-story-edition">Make yourself at home</span>
        </div>
        <div className="login-story-copy">
          <span className="login-story-rule" />
          <p className="login-story-kicker">Your next chapter starts here</p>
          <h1>A fresh start.<br /><em>More room to grow.</em></h1>
          <p className="login-story-description">Find your place, manage your rentals, and keep the everyday details beautifully in hand.</p>
        </div>
        <div className="login-story-bottom"><span>THE RENTAL WORKSPACE</span><span>Made for the places we live.</span></div>
      </section>

      <section className="login-access" aria-label="Create an account">
        <div className="register-topbar"><Link to="/welcome"><span aria-hidden="true">←</span>Back to Roomora</Link><Link to="/login">Sign in <span aria-hidden="true">↗</span></Link></div>
        <div className="login-card register-card">
          <div className="login-card-heading">
            <Link to="/welcome" className="login-card-wordmark">Roomora</Link>
            <h2>Make room for more<span className="login-heading-dot">.</span></h2>
            <p className="login-subtitle">Create your account. Your workspace awaits.</p>
          </div>

          <div className="login-role-section">
            <p className="login-role-label">Create an account as</p>
            <div className="login-role-options" role="group" aria-label="Choose account type">
              <button type="button" className={`login-role-option ${form.role === 'TENANT' ? 'is-selected' : ''}`} aria-pressed={form.role === 'TENANT'} onClick={() => chooseRole('TENANT')} disabled={busy}><Icon name="home" size={18} /><span>Tenant</span></button>
              <button type="button" className={`login-role-option ${form.role === 'OWNER' ? 'is-selected' : ''}`} aria-pressed={form.role === 'OWNER'} onClick={() => chooseRole('OWNER')} disabled={busy}><Icon name="building" size={18} /><span>Property owner</span></button>
            </div>
          </div>

          {error && <div className="login-error"><ErrorBanner message={error} /></div>}
          <div className="login-google"><GoogleSignIn onCredential={signUpWithGoogle} disabled={busy} /></div>
          <div className="login-divider"><span />or sign up with email<span /></div>

          <form onSubmit={submit} className="login-form">
            <label className="login-label" htmlFor="register-name">Full name</label>
            <input id="register-name" className="login-input" autoComplete="name" placeholder="Your full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} disabled={busy} required />
            <label className="login-label register-next-label" htmlFor="register-email">Email address</label>
            <input id="register-email" className="login-input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} required />
            <label className="login-label register-next-label" htmlFor="register-password">Password</label>
            <div className="login-password-wrap">
              <input id="register-password" className="login-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a password" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Use at least 8 characters, with an uppercase letter, a lowercase letter and a number." aria-describedby="register-password-requirements" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={busy} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <div id="register-password-requirements" className="register-password-requirements">
              {[
                { label: '8+ characters', valid: form.password.length >= 8 },
                { label: 'Upper & lowercase', valid: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) },
                { label: 'A number', valid: /[0-9]/.test(form.password) },
              ].map((rule) => <span key={rule.label} className={rule.valid ? 'is-met' : ''}><Icon name="check" size={12} /><span>{rule.label}<span className="sr-only">{rule.valid ? ': met' : ': required'}</span></span></span>)}
            </div>
            <button className="login-submit" disabled={busy}><span>{busy ? 'Creating your account…' : 'Create your account'}</span><span className="login-submit-arrow" aria-hidden="true">↗</span></button>
          </form>
          <div className="login-card-footer"><span>Already at home here?</span><Link to={`/login?role=${form.role}`}>Sign in <span aria-hidden="true">↗</span></Link></div>
        </div>
        <p className="register-staff-note">Staff accounts are created by property owners.</p>
      </section>
    </main>
  );
}
