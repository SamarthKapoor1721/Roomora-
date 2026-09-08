import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Card,
  EmptyState,
  ErrorBanner,
  MetricCard,
  PageHeader,
  Section,
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
  ai: { insights: string[]; risks: string[]; opportunities: string[] };
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* PRIORITY ROW — the few things a person acts on */}
          <Section title="Needs attention">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          </Section>

          {/* PORTFOLIO — supporting figures, grouped, not headline-sized */}
          <Section title="Portfolio">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="building" size={16} className="text-ink-400" />
                  <h3 className="text-sm font-semibold text-ink-900">Occupancy</h3>
                </div>
                <p className="font-display text-3xl font-semibold text-ink-900">
                  {data.occupancy.occupancyRate}%
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
              </Card>

              <Card>
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="wallet" size={16} className="text-ink-400" />
                  <h3 className="text-sm font-semibold text-ink-900">Revenue</h3>
                </div>
                <p className="font-display text-3xl font-semibold text-emerald-600">
                  {money(data.revenue.collectedThisMonth)}
                </p>
                <p className="text-xs text-ink-500">collected this month</p>
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
              </Card>

              <Card className="flex flex-col">
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="wrench" size={16} className="text-ink-400" />
                  <h3 className="text-sm font-semibold text-ink-900">Operations</h3>
                </div>
                <p className="font-display text-3xl font-semibold text-ink-900">
                  {data.maintenance.open + data.cleaning.pending}
                </p>
                <p className="text-xs text-ink-500">open tasks</p>
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
                <Link to="/owner/maintenance" className="btn-secondary btn-sm mt-4 self-start">
                  Manage tasks
                  <Icon name="chevronRight" size={13} />
                </Link>
              </Card>
            </div>
          </Section>

          {/* AI INSIGHTS */}
          <Section
            title="AI insights"
            description="What the data says, what to watch, and where the openings are."
          >
            {insightsLoading || !insights ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : insights.ai.insights.length === 0 &&
              insights.ai.risks.length === 0 &&
              insights.ai.opportunities.length === 0 ? (
              <EmptyState
                icon="sparkles"
                title="Not enough data yet"
                hint="Add properties, rooms and leases to see insights."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <InsightPanel
                  icon="info"
                  title="Insights"
                  items={insights.ai.insights}
                  accent="border-l-slate-300"
                  chip="bg-slate-100 text-ink-500"
                />
                <InsightPanel
                  icon="alert"
                  title="Risks"
                  items={insights.ai.risks}
                  accent="border-l-rose-400"
                  chip="bg-rose-50 text-rose-600"
                  emphasis
                />
                <InsightPanel
                  icon="arrowUpRight"
                  title="Opportunities"
                  items={insights.ai.opportunities}
                  accent="border-l-emerald-400"
                  chip="bg-emerald-50 text-emerald-600"
                />
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function InsightPanel({
  icon,
  title,
  items,
  accent,
  chip,
  emphasis = false,
}: {
  icon: 'info' | 'alert' | 'arrowUpRight';
  title: string;
  items: string[];
  accent: string;
  chip: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-card ${accent}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chip}`}>
          <Icon name={icon} size={15} />
        </span>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <span className="ml-auto text-xs font-medium text-ink-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-400">None flagged</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((i, idx) => (
            <li
              key={idx}
              className={`flex gap-2 leading-snug ${
                emphasis ? 'text-sm font-medium text-ink-800' : 'text-sm text-ink-700'
              }`}
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  emphasis ? 'bg-rose-400' : 'bg-slate-300'
                }`}
              />
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
