import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Card,
  ErrorBanner,
  MetricCard,
  PageHeader,
  Section,
  Skeleton,
  StatLine,
} from '../../components/ui';

export default function StaffDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', 'dashboard'],
    queryFn: async () => (await api.get('/analytics/staff/dashboard')).data.data,
  });

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader title="My work" description="Your assigned tasks and anything running late." />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Needs attention">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Open maintenance"
                value={data.maintenance.open}
                hint="Assigned and not yet done"
                tone={data.maintenance.open ? 'warning' : 'positive'}
                icon="wrench"
                to="/staff/maintenance"
              />
              <MetricCard
                label="Overdue maintenance"
                value={data.overdue.maintenance}
                hint="High/urgent, older than 2 days"
                tone={data.overdue.maintenance ? 'critical' : 'positive'}
                icon="alert"
                to="/staff/maintenance"
              />
              <MetricCard
                label="Overdue cleaning"
                value={data.overdue.cleaning}
                hint="Past the scheduled date"
                tone={data.overdue.cleaning ? 'critical' : 'positive'}
                icon="broom"
                to="/staff/cleaning"
              />
              <MetricCard
                label="Completed (30 days)"
                value={data.completedLast30Days}
                hint="Maintenance tasks finished"
                tone="positive"
                icon="check"
              />
            </div>
          </Section>

          <Section title="Breakdown">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="wrench" size={16} className="text-ink-400" />
                    <h3 className="text-sm font-semibold text-ink-900">Maintenance by status</h3>
                  </div>
                  <Link to="/staff/maintenance" className="btn-secondary btn-sm">Open <Icon name="chevronRight" size={13} /></Link>
                </div>
                <StatusBreakdown map={data.maintenance.byStatus} />
              </Card>
              <Card>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="broom" size={16} className="text-ink-400" />
                    <h3 className="text-sm font-semibold text-ink-900">Cleaning by status</h3>
                  </div>
                  <Link to="/staff/cleaning" className="btn-secondary btn-sm">Open <Icon name="chevronRight" size={13} /></Link>
                </div>
                <StatusBreakdown map={data.cleaning.byStatus} />
              </Card>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function StatusBreakdown({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map);
  if (entries.length === 0) return <p className="py-2 text-sm text-ink-400">Nothing assigned.</p>;
  return (
    <div>
      {entries.map(([k, v]) => (
        <StatLine key={k} label={k.replaceAll('_', ' ')} value={v} />
      ))}
    </div>
  );
}
