import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGlobalRipple } from '../lib/ripple';
import { Icon, type IconName } from './Icon';
import AssistantWidget from './AssistantWidget';
import GutterDecor from './GutterDecor';
import { RouteTransition } from './RouteTransition';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const NAV: Record<string, NavItem[]> = {
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
  ],
  TENANT: [
    { to: '/tenant', label: 'Dashboard', icon: 'home', end: true },
    { to: '/tenant/browse', label: 'Browse rooms', icon: 'search' },
    { to: '/tenant/applications', label: 'My applications', icon: 'inbox' },
    { to: '/tenant/payments', label: 'Rent & payments', icon: 'wallet' },
    { to: '/tenant/maintenance', label: 'Maintenance', icon: 'wrench' },
  ],
  STAFF: [
    { to: '/staff', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/staff/maintenance', label: 'Maintenance tasks', icon: 'wrench' },
    { to: '/staff/cleaning', label: 'Cleaning tasks', icon: 'broom' },
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

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () =>
      (await api.get('/notifications?unread=true&pageSize=1')).data.meta.unreadCount as number,
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const roleLabel = { OWNER: 'Property owner', TENANT: 'Tenant', STAFF: 'Staff' }[
    user?.role ?? 'TENANT'
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium
     transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]
     active:scale-95 ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-ink-700 hover:-translate-y-px hover:bg-brand-50 hover:text-brand-700'
    }`;

  return (
    <div className="min-h-screen">
      {/* ── Top navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        {/* row 1: brand + account */}
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              R
            </span>
            <span className="font-display text-sm font-semibold text-ink-900">Roomora</span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="relative inline-flex" title={`${unread ?? 0} unread notifications`}>
              <Icon name="bell" size={19} className="text-ink-500" />
              {!!unread && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink-900">{user?.fullName}</p>
              <p className="text-2xs uppercase tracking-wide text-ink-400">{roleLabel}</p>
            </div>
            <button
              className="btn-secondary btn-sm"
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
              className="btn-ghost btn-sm -mr-2 md:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileNav}
            >
              <Icon name={mobileNav ? 'x' : 'menu'} size={18} />
            </button>
          </div>
        </div>

        {/* row 2: horizontal nav (desktop) */}
        <nav className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-1.5 sm:px-5 lg:px-7">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navLinkClass}>
                {({ isActive }) => (
                  <>
                    <Icon
                      key={String(isActive)}
                      name={n.icon}
                      size={16}
                      className={isActive ? 'nav-pop' : 'text-ink-400'}
                    />
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* mobile nav panel */}
        {mobileNav && (
          <nav className="border-t border-slate-100 bg-white px-3 py-2 md:hidden">
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

      <GutterDecor />
      <RouteTransition nav={navLookup} />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div key={featureKey} className="route-page-in">
          <Outlet />
        </div>
      </main>

      {user?.role === 'OWNER' && <AssistantWidget />}
    </div>
  );
}
