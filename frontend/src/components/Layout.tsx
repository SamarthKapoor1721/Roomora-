import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useGlobalRipple } from '../lib/ripple';
import { Icon, type IconName } from './Icon';
import AssistantWidget from './AssistantWidget';
import NotificationBell from './NotificationBell';
import { RouteTransition } from './RouteTransition';
import Tutorial from './tutorial/Tutorial';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const NAV: Record<string, NavItem[]> = {
  SUPER_ADMIN: [{ to: '/super_admin', label: 'Control room', icon: 'dashboard', end: true }, { to: '/account', label: 'Account', icon: 'key' }],
  OWNER: [
    { to: '/owner', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/owner/properties', label: 'Properties', icon: 'building' },
    { to: '/owner/applications', label: 'Applications', icon: 'inbox' },
    { to: '/owner/leases', label: 'Leases', icon: 'file' },
    { to: '/owner/payments', label: 'Payments', icon: 'wallet' },
    { to: '/owner/maintenance', label: 'Maintenance', icon: 'wrench' },
    { to: '/owner/cleaning', label: 'Cleaning', icon: 'broom' },
    { to: '/owner/staff', label: 'Staff', icon: 'users' },
    { to: '/owner/warnings', label: 'Warnings', icon: 'alert' },
    { to: '/account', label: 'Account', icon: 'key' },
  ],
  TENANT: [
    { to: '/tenant', label: 'Dashboard', icon: 'home', end: true },
    { to: '/tenant/browse', label: 'Browse rooms', icon: 'search' },
    { to: '/tenant/applications', label: 'My applications', icon: 'inbox' },
    { to: '/tenant/payments', label: 'Rent & payments', icon: 'wallet' },
    { to: '/tenant/maintenance', label: 'Maintenance', icon: 'wrench' },
    { to: '/account', label: 'Account', icon: 'key' },
  ],
  STAFF: [
    { to: '/staff', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/staff/maintenance', label: 'Maintenance tasks', icon: 'wrench' },
    { to: '/staff/cleaning', label: 'Cleaning tasks', icon: 'broom' },
    { to: '/account', label: 'Account', icon: 'key' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const items = user ? NAV[user.role] : [];

  useGlobalRipple();

  // path "feature" -> { icon, label } for the route-switch flourish, e.g.
  // "owner/leases" and the bare "owner" (dashboard).
  const navLookup = useMemo(() => {
    const map: Record<string, { icon: IconName; label: string }> = {};
    for (const n of items) {
      map[n.to.replace(/^\/+/, '')] = { icon: n.icon, label: n.label };
    }
    return map;
  }, [items]);

  const featureKey = location.pathname.replace(/^\/+/, '').split('/').slice(0, 2).join('/');

  const roleLabel = { SUPER_ADMIN: 'Super admin', OWNER: 'Property owner', TENANT: 'Tenant', STAFF: 'Staff' }[
    user?.role ?? 'TENANT'
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium
     transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
          <span className="shrink-0 font-wordmark text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Roomora</span>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2.5">
            {user && (user.role === 'OWNER' || user.role === 'TENANT') && !(user.googleConnected && user.hasPassword === false) && <Tutorial key={`${user.id}:${user.role}`} userId={user.id} role={user.role} />}
            {user && <NotificationBell userId={user.id} role={user.role} />}

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <div className="hidden max-w-48 text-right lg:block">
              <p className="truncate text-sm font-medium leading-tight text-ink-900">{user?.fullName}</p>
              <p className="text-2xs uppercase tracking-wide text-ink-400">{roleLabel}</p>
            </div>
            <button
              className="btn-secondary btn-sm !h-9 !w-9 !p-0 sm:!h-auto sm:!w-auto sm:!px-3 sm:!py-1.5"
              aria-label="Sign out"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              <Icon name="logout" size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>

            {/* mobile nav toggle */}
            <button
              className="btn-ghost btn-sm !h-9 !w-9 !p-0 xl:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileNav}
            >
              <Icon name={mobileNav ? 'x' : 'menu'} size={18} />
            </button>
          </div>
        </div>

        {/* mobile nav panel */}
        {mobileNav && (
          <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-100 bg-white px-3 py-2 xl:hidden" aria-label="Workspace navigation">
            <div className="grid gap-0.5">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMobileNav(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-brand-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={n.icon} size={17} className={isActive ? '' : 'text-ink-400'} />
                      {n.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <RouteTransition nav={navLookup} />

      <div className="relative z-10 mx-auto grid max-w-[1500px] gap-8 px-4 py-6 sm:px-6 lg:px-8 xl:grid-cols-[15rem_minmax(0,1fr)] xl:py-8">
        <aside className="hidden xl:block">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-[#dfe8da] bg-[#fbfcf9] p-3 shadow-[0_12px_32px_rgba(30,58,42,0.05)]" aria-label="Workspace navigation">
            <div className="px-3.5 pb-3 pt-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand-700">Workspace</p>
              <p className="mt-1 text-sm text-ink-500">{roleLabel}</p>
            </div>
            <div className="grid gap-1">
              {items.map((n) => (
                <div key={n.to} className={n.to === '/account' ? 'mt-3 border-t border-slate-200 pt-3' : ''}>
                  <NavLink to={n.to} end={n.end} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        <Icon name={n.icon} size={18} className={isActive ? 'nav-pop' : 'text-ink-400 group-hover:text-brand-700'} />
                        <span>{n.label}</span>
                      </>
                    )}
                  </NavLink>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        <main className="min-w-0" data-tour-page>
          <div key={featureKey} className="route-page-in">
            <Outlet />
          </div>
        </main>
      </div>

      {user?.role === 'OWNER' && <AssistantWidget />}
    </div>
  );
}
