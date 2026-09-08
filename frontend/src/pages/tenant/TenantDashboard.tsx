import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Section,
  Skeleton,
  StatLine,
  StatusPill,
  money,
  date,
  relDays,
} from '../../components/ui';

export default function TenantDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'dashboard'],
    queryFn: async () => (await api.get('/analytics/tenant/dashboard')).data.data,
  });
  const roommates = useQuery({
    queryKey: ['tenant', 'roommates'],
    queryFn: async () =>
      (await api.get('/tenant/roommates')).data.data as {
        tenant: { fullName: string; phone: string | null };
      }[],
    enabled: !!data?.room,
  });

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="My home" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const rentDue = data.rent.nextDue;

  return (
    <div>
      <PageHeader
        title={data.room ? `${data.room.property.name} · ${data.room.name}` : 'My home'}
        description={
          data.room
            ? `${data.room.property.addressLine1}, ${data.room.property.city}`
            : 'You are not assigned to a room yet.'
        }
      />

      {!data.room ? (
        <EmptyState
          icon="home"
          title="No room assigned yet"
          hint="Browse rooms that are open for applications and apply. Once an owner approves you, your tenancy details show up here."
          action={
            <Link to="/tenant/browse" className="btn-primary">
              <Icon name="search" size={16} />
              Browse rooms
            </Link>
          }
        />
      ) : (
        <>
          {/* RENT — the one thing a tenant checks most */}
          {rentDue && (
            <Section>
              <div
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${
                  rentDue.status === 'OVERDUE'
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-brand-200 bg-brand-50'
                }`}
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Next payment · {rentDue.period}
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold text-ink-900">
                    {money(rentDue.amount)}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    Due {date(rentDue.dueDate)} ({relDays(rentDue.dueDate)}) &nbsp;
                    <StatusPill value={rentDue.status} />
                  </p>
                </div>
                <Link to="/tenant/payments" className="btn-primary">
                  <Icon name="wallet" size={16} />
                  Pay now
                </Link>
              </div>
            </Section>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Tenancy */}
            <Card className="lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="key" size={16} className="text-ink-400" />
                <h3 className="text-sm font-semibold text-ink-900">My tenancy</h3>
              </div>
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                <StatLine label="Moved in" value={date(data.room.startDate)} />
                {data.lease && <StatLine label="Lease ends" value={date(data.lease.endDate)} />}
                {data.lease && <StatLine label="Monthly rent" value={money(data.lease.monthlyRent)} />}
                {data.food.enabled && (
                  <StatLine
                    label="Food"
                    value={data.food.optedIn ? `${money(data.food.charge)} / mo` : 'Not opted in'}
                  />
                )}
                <StatLine label="Rent billed" value={money(data.rent.billed)} />
                <StatLine label="Rent paid" value={money(data.rent.paid)} tone="positive" />
                <StatLine
                  label="Outstanding"
                  value={money(data.rent.outstanding)}
                  tone={data.rent.outstanding ? 'critical' : 'default'}
                />
              </div>
              {data.lease && (
                <Link to="/tenant/payments" className="btn-secondary btn-sm mt-4">
                  Payment history
                  <Icon name="chevronRight" size={13} />
                </Link>
              )}
            </Card>

            {/* Roommates */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Icon name="users" size={16} className="text-ink-400" />
                <h3 className="text-sm font-semibold text-ink-900">Roommates</h3>
              </div>
              {roommates.data && roommates.data.length > 0 ? (
                <ul className="space-y-2.5">
                  {roommates.data.map((r, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-ink-600">
                        {r.tenant.fullName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">{r.tenant.fullName}</p>
                        {r.tenant.phone && <p className="text-xs text-ink-500">{r.tenant.phone}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-400">You have the room to yourself.</p>
              )}
            </Card>
          </div>

          {/* Quick links */}
          <Section title="Quick actions" className="mt-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickLink to="/tenant/payments" icon="wallet" title="Rent & payments" sub="View and pay invoices" />
              <QuickLink
                to="/tenant/maintenance"
                icon="wrench"
                title="Maintenance"
                sub={`${
                  (data.maintenance.OPEN ?? 0) +
                  (data.maintenance.ASSIGNED ?? 0) +
                  (data.maintenance.IN_PROGRESS ?? 0)
                } open request(s)`}
              />
              <QuickLink
                to="/tenant/browse"
                icon="alert"
                title="Warnings"
                sub={data.warnings.active ? `${data.warnings.active} active` : 'None active'}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  sub,
}: {
  to: string;
  icon: 'wallet' | 'wrench' | 'alert';
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-pop"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{sub}</p>
      </div>
      <Icon name="chevronRight" size={16} className="ml-auto text-ink-400" />
    </Link>
  );
}
