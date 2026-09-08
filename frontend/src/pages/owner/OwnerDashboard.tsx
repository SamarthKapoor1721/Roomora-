import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  AiSourceTag,
  EmptyState,
  ErrorBanner,
  MetricCard,
  PageHeader,
  Skeleton,
  StatLine,
  money,
} from '../../components/ui';

interface Dashboard {
  properties: { total: number };
  occupancy: {
    totalCapacity: number;
    totalOccupants: number;
    vacantBeds: number;
    occupancyRate: number;
    rooms: number;
    vacantRooms: number;
  };
  applications: { byStatus: Record<string, number>; pendingApprovals: number };
  leases: { active: number; expiringSoon: number };
  revenue: { billedAllTime: number; collectedAllTime: number; outstanding: number; collectedThisMonth: number };
  payments: { latePayments: number; overduePayments: number };
  maintenance: { open: number; byStatus: Record<string, number> };
  cleaning: { pending: number; byStatus: Record<string, number> };
  warnings: { active: number; bySeverity: Record<string, number> };
}

interface Insights {
  ai: { source: string; insights: string[]; risks: string[]; opportunities: string[] };
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-10 border-b border-slate-200 pb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400 first:mt-0">
      {children}
    </h2>
  );
}

export default function OwnerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: async () => (await api.get('/analytics/owner/dashboard')).data.data as Dashboard,
  });
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['owner', 'insights'],
    queryFn: async () => (await api.get('/analytics/owner/insights')).data.data as Insights,
  });

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="What needs your attention today, and how the portfolio is doing."
      />

      {isLoading || !data ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <Heading>Needs attention</Heading>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Pending approvals"
              value={data.applications.pendingApprovals}
              hint={data.applications.pendingApprovals ? 'Applications awaiting your decision' : 'All caught up'}
              tone={data.applications.pendingApprovals ? 'warning' : 'positive'}
              icon="inbox"
              to="/owner/applications"
            />
            <MetricCard
              label="Overdue rent"
              value={money(data.revenue.outstanding)}
              hint={`${data.payments.overduePayments} payment${data.payments.overduePayments === 1 ? '' : 's'} overdue`}
              tone={data.revenue.outstanding ? 'critical' : 'positive'}
              icon="wallet"
              to="/owner/payments"
            />
            <MetricCard
              label="Active warnings"
              value={data.warnings.active}
              hint={
                data.warnings.active
                  ? `${data.warnings.bySeverity.HIGH ?? 0} high · ${data.warnings.bySeverity.CRITICAL ?? 0} critical`
                  : 'No open warnings'
              }
              tone={data.warnings.active ? 'critical' : 'positive'}
              icon="alert"
              to="/owner/warnings"
            />
            <MetricCard
              label="Leases expiring"
              value={data.leases.expiringSoon}
              hint="Within the next 30 days"
              tone={data.leases.expiringSoon ? 'warning' : 'default'}
              icon="file"
              to="/owner/leases"
            />
          </div>

          <Heading>Portfolio</Heading>
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Icon name="building" size={15} className="text-ink-300" />
                <h3 className="text-sm font-semibold text-ink-900">Occupancy</h3>
              </div>
              <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
                {data.occupancy.occupancyRate}%
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${data.occupancy.occupancyRate}%` }}
                />
              </div>
              <div className="mt-3">
                <StatLine label="Beds occupied" value={`${data.occupancy.totalOccupants} / ${data.occupancy.totalCapacity}`} />
                <StatLine label="Vacant rooms" value={data.occupancy.vacantRooms} />
                <StatLine label="Properties" value={data.properties.total} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Icon name="wallet" size={15} className="text-ink-300" />
                <h3 className="text-sm font-semibold text-ink-900">Revenue</h3>
              </div>
              <p className="font-display text-3xl font-semibold tabular-nums text-emerald-600">
                {money(data.revenue.collectedThisMonth)}
              </p>
              <p className="text-xs text-ink-400">collected this month</p>
              <div className="mt-3">
                <StatLine label="Collected all-time" value={money(data.revenue.collectedAllTime)} />
                <StatLine label="Billed all-time" value={money(data.revenue.billedAllTime)} />
                <StatLine
                  label="Outstanding"
                  value={money(data.revenue.outstanding)}
                  tone={data.revenue.outstanding ? 'critical' : 'default'}
                />
                <StatLine label="Late payments (all-time)" value={data.payments.latePayments} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Icon name="wrench" size={15} className="text-ink-300" />
                <h3 className="text-sm font-semibold text-ink-900">Operations</h3>
              </div>
              <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
                {data.maintenance.open + data.cleaning.pending}
              </p>
              <p className="text-xs text-ink-400">open tasks</p>
              <div className="mt-3">
                <StatLine
                  label="Maintenance open"
                  value={data.maintenance.open}
                  tone={data.maintenance.open ? 'warning' : 'default'}
                />
                <StatLine
                  label="Cleaning pending"
                  value={data.cleaning.pending}
                  tone={data.cleaning.pending ? 'warning' : 'default'}
                />
                <StatLine label="Active leases" value={data.leases.active} />
              </div>
              <Link
                to="/owner/maintenance"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Manage tasks <Icon name="chevronRight" size={12} />
              </Link>
            </div>
          </div>

          <div className="mb-1.5 mt-10 flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">AI insights</h2>
            {insights && <AiSourceTag source={insights.ai.source} />}
          </div>
          <p className="mb-4 text-sm text-ink-400">
            What the data says, what to watch, and where the openings are.
          </p>

          {insightsLoading || !insights ? (
            <div className="grid gap-8 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : insights.ai.insights.length === 0 &&
            insights.ai.risks.length === 0 &&
            insights.ai.opportunities.length === 0 ? (
            <EmptyState
              icon="bot"
              title="Not enough data yet"
              hint="Add properties, rooms and leases to see insights."
            />
          ) : (
            <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
              <InsightList icon="info" title="Insights" items={insights.ai.insights} tone="text-ink-600" dot="bg-slate-300" />
              <InsightList icon="alert" title="Risks" items={insights.ai.risks} tone="text-rose-700" dot="bg-rose-400" emphasis />
              <InsightList
                icon="arrowUpRight"
                title="Opportunities"
                items={insights.ai.opportunities}
                tone="text-emerald-700"
                dot="bg-emerald-400"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InsightList({
  icon,
  title,
  items,
  tone,
  dot,
  emphasis = false,
}: {
  icon: 'info' | 'alert' | 'arrowUpRight';
  title: string;
  items: string[];
  tone: string;
  dot: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        <Icon name={icon} size={13} />
        {title}
        <span className="ml-auto font-medium normal-case text-ink-300">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-300">None flagged</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i, idx) => (
            <li
              key={idx}
              className={`flex gap-2 leading-snug ${emphasis ? 'text-sm font-medium' : 'text-sm'} ${tone}`}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
