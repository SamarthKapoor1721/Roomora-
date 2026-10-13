import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon, type IconName } from '../../components/Icon';
import ModalOverlay from '../../components/ModalOverlay';
import { EmptyState, ErrorBanner, Skeleton, money } from '../../components/ui';
import './OwnerDashboard.css';

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
  ai: { source?: string; available?: boolean; insights: string[]; risks: string[]; opportunities: string[] };
}

export default function OwnerDashboard() {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const insightsAbort = useRef<AbortController | null>(null);
  useEffect(() => () => insightsAbort.current?.abort(), []);
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: async () => (await api.get('/analytics/owner/dashboard')).data.data as Dashboard,
  });
  const insightsRequest = useMutation({
    retry: false,
    mutationFn: async () => {
      const started = Date.now();
      const controller = new AbortController();
      insightsAbort.current = controller;
      let deadline: number | undefined;
      try {
        const result = await Promise.race([
          api.get('/analytics/owner/insights', { timeout: 45_000, signal: controller.signal }),
          new Promise<never>((_, reject) => {
            deadline = window.setTimeout(() => {
              reject(new Error('Analysis is taking too long. The AI service may still be starting. Please try again shortly.'));
              controller.abort();
            }, 45_000);
          }),
        ]);
        const response = result.data.data as Insights;
        // Also handle older deployments that returned the outage as an insight.
        if (response.ai.available === false || response.ai.insights.some((item) => item.startsWith('AI insight generation unavailable'))) {
          throw new Error('The AI service could not respond. It may still be starting up. Please try again shortly; your dashboard data is still available.');
        }
        return response;
      } finally {
        window.clearTimeout(deadline);
        if (insightsAbort.current === controller) insightsAbort.current = null;
        const remaining = 1600 - (Date.now() - started);
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
    },
    onSuccess: setInsights,
  });

  const generateInsights = () => {
    if (insightsRequest.isPending) return;
    setInsights(null);
    setInsightsOpen(true);
    insightsRequest.mutate();
  };

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div className="owner-dashboard">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">OWNER WORKSPACE</p>
          <h1>Dashboard</h1>
          <p className="dashboard-intro">A clear view of your properties and what needs action.</p>
        </div>
        <span className="dashboard-date">{new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
      </header>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <>
          <section className="dashboard-section" aria-labelledby="attention-heading">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-section-index">YOUR PRIORITIES</p>
                <h2 id="attention-heading">Needs attention</h2>
              </div>
              <p>Start with the items that may need a decision.</p>
            </div>
            <div className="dashboard-priority-grid">
              <Link to="/owner/applications" className="dashboard-focus">
                <span className="dashboard-focus-top">
                  <span>APPLICATIONS</span>
                  <Icon name="inbox" size={21} />
                </span>
                <span className="dashboard-focus-main">
                  <strong>{data.applications.pendingApprovals}</strong>
                  <span>
                    <b>Pending approval{data.applications.pendingApprovals === 1 ? '' : 's'}</b>
                    <small>{data.applications.pendingApprovals ? 'Waiting for your decision' : 'Your application queue is clear'}</small>
                  </span>
                </span>
                <span className="dashboard-focus-action">
                  Review applications <Icon name="arrowUpRight" size={17} />
                </span>
              </Link>
              <div className="dashboard-signals" aria-label="Other items to review">
                <SignalRow
                  icon="wallet"
                  label="Overdue rent"
                  value={money(data.revenue.outstanding)}
                  detail={data.payments.overduePayments + ' payment' + (data.payments.overduePayments === 1 ? '' : 's') + ' overdue'}
                  to="/owner/payments"
                  active={data.revenue.outstanding > 0}
                />
                <SignalRow
                  icon="alert"
                  label="Active warnings"
                  value={data.warnings.active}
                  detail={data.warnings.active
                    ? (data.warnings.bySeverity.HIGH ?? 0) + ' high · ' + (data.warnings.bySeverity.CRITICAL ?? 0) + ' critical'
                    : 'No open warnings'}
                  to="/owner/warnings"
                  active={data.warnings.active > 0}
                />
                <SignalRow
                  icon="file"
                  label="Leases expiring"
                  value={data.leases.expiringSoon}
                  detail="Within the next 30 days"
                  to="/owner/leases"
                  active={data.leases.expiringSoon > 0}
                />
              </div>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="portfolio-heading">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-section-index">THE BIG PICTURE</p>
                <h2 id="portfolio-heading">Portfolio overview</h2>
              </div>
            </div>
            <div className="dashboard-portfolio-grid">
              <div className="dashboard-portfolio-card dashboard-occupancy">
                <div className="dashboard-card-head">
                  <h3>Occupancy</h3>
                  <Icon name="building" size={19} />
                </div>
                <p className="dashboard-card-value">{data.occupancy.occupancyRate}<span>%</span></p>
                <p className="dashboard-card-caption">of available beds occupied</p>
                <div className="dashboard-occupancy-track" role="img" aria-label={data.occupancy.occupancyRate + '% of beds occupied'}>
                  <span style={{ width: Math.max(0, Math.min(100, data.occupancy.occupancyRate)) + '%' }} />
                </div>
                <dl className="dashboard-fact-grid dashboard-occupancy-facts">
                  <div><dt>Beds occupied</dt><dd>{data.occupancy.totalOccupants} / {data.occupancy.totalCapacity}</dd></div>
                  <div><dt>Vacant rooms</dt><dd>{data.occupancy.vacantRooms}</dd></div>
                  <div><dt>Properties</dt><dd>{data.properties.total}</dd></div>
                </dl>
              </div>

              <div className="dashboard-portfolio-card dashboard-revenue">
                <div className="dashboard-card-head">
                  <h3>Revenue</h3>
                  <Icon name="wallet" size={19} />
                </div>
                <p className="dashboard-card-value">{money(data.revenue.collectedThisMonth)}</p>
                <p className="dashboard-card-caption">collected this month</p>
                <dl className="dashboard-fact-grid">
                  <div><dt>Collected all-time</dt><dd>{money(data.revenue.collectedAllTime)}</dd></div>
                  <div><dt>Billed all-time</dt><dd>{money(data.revenue.billedAllTime)}</dd></div>
                  <div><dt>Outstanding</dt><dd>{money(data.revenue.outstanding)}</dd></div>
                  <div><dt>Late payments</dt><dd>{data.payments.latePayments}</dd></div>
                </dl>
              </div>

              <div className="dashboard-portfolio-card dashboard-operations">
                <div className="dashboard-card-head">
                  <h3>Operations</h3>
                  <Icon name="wrench" size={19} />
                </div>
                <p className="dashboard-card-value">{data.maintenance.open + data.cleaning.pending}</p>
                <p className="dashboard-card-caption">open tasks</p>
                <dl className="dashboard-fact-grid dashboard-operations-facts">
                  <div><dt>Maintenance open</dt><dd>{data.maintenance.open}</dd></div>
                  <div><dt>Cleaning pending</dt><dd>{data.cleaning.pending}</dd></div>
                  <div><dt>Active leases</dt><dd>{data.leases.active}</dd></div>
                </dl>
                <Link to="/owner/maintenance" className="dashboard-manage-link">
                  Manage tasks <Icon name="arrowUpRight" size={15} />
                </Link>
              </div>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="insights-heading">
            <div className="dashboard-section-head dashboard-insights-head">
              <div>
                <span className="dashboard-section-index">03 / ANALYSIS</span>
                <h2 id="insights-heading">AI insights</h2>
                <p>A fresh look at your portfolio, whenever you need it.</p>
              </div>
              <button className="insights-trigger" type="button" onClick={generateInsights} disabled={insightsRequest.isPending}>
                <Icon name="sparkles" size={17} />
                <span>{insightsRequest.isPending ? 'Analyzing…' : insights ? 'Refresh insights' : 'Generate insights'}</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            {!insights ? (
              <div className="insights-prompt">
                <div className="insights-prompt-icon"><Icon name="sparkles" size={22} /></div>
                <div>
                  <h3>Your portfolio, in perspective.</h3>
                  <p>Generate a current summary of insights, risks and opportunities when you’re ready.</p>
                </div>
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
          </section>
        </>
      )}

      {insightsOpen && (
        <InsightsExperience
          insights={insights}
          loading={insightsRequest.isPending}
          error={insightsRequest.error}
          onClose={() => { insightsAbort.current?.abort(); setInsightsOpen(false); }}
          onRetry={generateInsights}
        />
      )}
    </div>
  );
}

function SignalRow({
  label,
  value,
  detail,
  icon,
  to,
  active,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: IconName;
  to: string;
  active: boolean;
}) {
  return (
    <Link to={to} className={'dashboard-signal' + (active ? ' dashboard-signal-active' : '')}>
      <span className="dashboard-signal-icon"><Icon name={icon} size={18} /></span>
      <span className="dashboard-signal-copy"><b>{label}</b><small>{detail}</small></span>
      <strong className="dashboard-signal-value">{value}</strong>
      <Icon name="chevronRight" size={17} className="dashboard-signal-arrow" />
    </Link>
  );
}

const analysisSteps = [
  'Reading your portfolio',
  'Looking for patterns',
  'Finding what matters',
];

function InsightsExperience({
  insights,
  loading,
  error,
  onClose,
  onRetry,
}: {
  insights: Insights | null;
  loading: boolean;
  error: Error | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const timer = window.setInterval(() => setStep((current) => (current + 1) % analysisSteps.length), 2800);
    return () => window.clearInterval(timer);
  }, [loading]);

  return (
    <ModalOverlay onClose={onClose} labelledBy="insights-experience-title">
      <div className="insights-experience">
        <div className="insights-experience-glow" aria-hidden="true" />
        <div className="insights-experience-top">
          <span className="insights-experience-brand">ROOMORA <span>/</span> INTELLIGENCE</span>
          <button type="button" className="insights-experience-close" onClick={onClose} aria-label="Close insights">
            <Icon name="x" size={18} />
          </button>
        </div>

        {loading ? (
          <div className="insights-experience-loading" role="status" aria-live="polite">
            <div className="insights-orb" aria-hidden="true">
              <span className="insights-orb-halo" />
              <span className="insights-orb-ring insights-orb-ring-one" />
              <span className="insights-orb-ring insights-orb-ring-two" />
              <span className="insights-orb-core" />
            </div>
            <p className="insights-experience-kicker">A CLOSER LOOK</p>
            <h2 id="insights-experience-title" key={step}>{analysisSteps[step]}<span>.</span></h2>
            <p className="insights-experience-caption">Turning your latest rental data into a clearer picture.</p>
            <div className="insights-experience-progress" aria-hidden="true"><span /></div>
          </div>
        ) : error ? (
          <div className="insights-experience-message" role="alert">
            <div className="insights-experience-symbol"><Icon name="alert" size={30} /></div>
            <p className="insights-experience-kicker">ANALYSIS INTERRUPTED</p>
            <h2 id="insights-experience-title">We couldn’t finish this time.</h2>
            <p>{apiErrorMessage(error)}</p>
            <button type="button" className="insights-experience-primary" onClick={onRetry}>Try again <span aria-hidden="true">↗</span></button>
            <button type="button" className="insights-experience-secondary" onClick={onClose}>Back to dashboard</button>
          </div>
        ) : insights ? (
          <div className="insights-experience-results">
            <div className="insights-results-heading">
              <span className="insights-results-mark"><Icon name="sparkles" size={24} /></span>
              <p className="insights-experience-kicker">YOUR PORTFOLIO, IN PERSPECTIVE</p>
              <h2 id="insights-experience-title">Here’s what stands out<span>.</span></h2>
              <p>{insights.ai.source === 'RULE_BASED_FALLBACK' ? 'A summary based on your portfolio metrics. AI analysis is currently unavailable.' : 'Insights based on your latest properties, leases, payments and operations.'}</p>
            </div>
            <div className="insights-results-grid">
              <InsightPanel icon="info" title="Insights" items={insights.ai.insights} accent="border-l-slate-300" chip="bg-slate-100 text-ink-500" />
              <InsightPanel icon="alert" title="Risks" items={insights.ai.risks} accent="border-l-rose-400" chip="bg-rose-50 text-rose-600" emphasis />
              <InsightPanel icon="arrowUpRight" title="Opportunities" items={insights.ai.opportunities} accent="border-l-emerald-400" chip="bg-emerald-50 text-emerald-600" />
            </div>
            <button type="button" className="insights-experience-primary" onClick={onClose}>Back to dashboard <span aria-hidden="true">↗</span></button>
          </div>
        ) : null}
      </div>
    </ModalOverlay>
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
    <div className={`min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-card ${accent}`}>
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
              <span className="min-w-0 [overflow-wrap:anywhere]">{i}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
