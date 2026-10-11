import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, warmApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorBanner } from '../components/ui';
import GoogleSignIn from '../components/GoogleSignIn';
import { Icon } from '../components/Icon';
import './Login.css';

export default function Login() {
  const { user, login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get('role') === 'OWNER' ? 'OWNER' : 'TENANT';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => { warmApi(); }, []);
  useEffect(() => {
    if (!busy) {
      setSlowConnection(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowConnection(true), 8_000);
    return () => window.clearTimeout(timer);
  }, [busy]);

  const chooseRole = (role: 'TENANT' | 'OWNER') => {
    setSearchParams({ role });
    setError('');
  };

  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const signedIn = await login(email, password);
      navigate(`/${signedIn.role.toLowerCase()}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async (credential: string) => {
    setBusy(true);
    setError('');
    try {
      const signedIn = await googleLogin(credential, selectedRole);
      navigate(`/${signedIn.role.toLowerCase()}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="About Roomora">
        <img className="login-story-image" src="/images/login-rental-home.jpg" alt="A bright rental home with two people reviewing documents at a table" />
        <div className="login-story-shade" />
        <div className="login-story-top">
          <Link to="/welcome" className="login-wordmark">Roomora</Link>
          <span className="login-story-edition">The rental workspace</span>
        </div>
        <div className="login-story-copy">
          <span className="login-story-rule" />
          <p className="login-story-kicker">A more thoughtful way to rent</p>
          <h1>Home is in<br /><em>the details.</em></h1>
          <p className="login-story-description">Everything from the first viewing to the everyday details, beautifully in hand.</p>
        </div>
        <div className="login-story-bottom"><span>ROOMORA / 01</span><span>Made for the places we live.</span></div>
      </section>

      <section className="login-access" aria-label="Sign in">
        <div className="login-access-top"><span>ROOMORA&nbsp; / &nbsp;ACCOUNT ACCESS</span></div>
        <div className="login-card">
          <div className="login-card-heading">
            <Link to="/welcome" className="login-card-wordmark">Roomora</Link>
            <p className="login-eyebrow">Your rental workspace</p>
            <h2>Welcome back<span className="login-heading-dot">.</span></h2>
            <p className="login-subtitle">Pick up right where you left off.</p>
          </div>

          <div className="login-role-section">
            <p className="login-role-label">I’m signing in as</p>
            <div className="login-role-options" role="group" aria-label="Choose account type">
              <button type="button" className={`login-role-option ${selectedRole === 'TENANT' ? 'is-selected' : ''}`} aria-pressed={selectedRole === 'TENANT'} onClick={() => chooseRole('TENANT')} disabled={busy}>
                <Icon name="home" size={18} /><span>Tenant</span>
              </button>
              <button type="button" className={`login-role-option ${selectedRole === 'OWNER' ? 'is-selected' : ''}`} aria-pressed={selectedRole === 'OWNER'} onClick={() => chooseRole('OWNER')} disabled={busy}>
                <Icon name="building" size={18} /><span>Property owner</span>
              </button>
            </div>
            <p className="login-role-hint">New Google accounts use this role. Existing accounts keep their assigned workspace.</p>
          </div>

          {error && <div className="login-error"><ErrorBanner message={error} /></div>}
          {slowConnection && <p className="login-connection-note" role="status">Still connecting to the server. Your sign-in is in progress.</p>}
          <div className="login-google"><GoogleSignIn onCredential={signInWithGoogle} disabled={busy} /></div>
          <div className="login-divider"><span />or sign in with email<span /></div>

          <form onSubmit={submit} className="login-form">
            <label className="login-label" htmlFor="login-email">Email address</label>
            <input id="login-email" className="login-input" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label className="login-label login-password-label" htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input id="login-password" className="login-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <button className="login-submit" disabled={busy}><span>{busy ? 'Signing in…' : 'Sign in to your workspace'}</span><span className="login-submit-arrow" aria-hidden="true">↗</span></button>
          </form>
          <div className="login-card-footer"><span>New to Roomora?</span><Link to={`/register?role=${selectedRole}`}>Create an account <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className="login-access-bottom"><span>One place for every part of home.</span><span>© Roomora</span></div>
      </section>
    </main>
  );
}
