import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';

const features: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'sparkles',
    title: 'AI-assisted screening',
    desc: 'Intelligent eligibility assessment and document verification — advisory only, you always decide.',
  },
  {
    icon: 'building',
    title: 'Properties & rooms',
    desc: 'Manage multiple properties, define rooms, set rent, upload images, and control application windows.',
  },
  {
    icon: 'file',
    title: 'Leases & payments',
    desc: 'Automatic lease creation on approval, monthly invoices, payment tracking with overdue alerts.',
  },
  {
    icon: 'wrench',
    title: 'Maintenance & cleaning',
    desc: 'Tenants raise requests with photos. Staff assigned, progress tracked, before/after proof.',
  },
  {
    icon: 'alert',
    title: 'Automatic warnings',
    desc: 'Hourly scan for overdue rent, lease expiry, repeated late payments, and task delays.',
  },
  {
    icon: 'bot',
    title: 'AI assistant',
    desc: 'Natural-language queries across your properties — occupancy, arrears, maintenance trends.',
  },
];

const roles: { icon: IconName; title: string; desc: string; color: string }[] = [
  {
    icon: 'key',
    title: 'Owner',
    desc: 'Full control — properties, applications, AI results, approvals, leases, rent, staff, analytics.',
    color: 'bg-brand-50 text-brand-700 ring-brand-200',
  },
  {
    icon: 'home',
    title: 'Tenant',
    desc: 'Browse rooms, apply, upload documents, pay rent, raise maintenance, view warnings.',
    color: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  {
    icon: 'users',
    title: 'Staff',
    desc: 'View assigned maintenance and cleaning tasks, update status, upload proof photos.',
    color: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
];

function FloatingIcon({
  icon,
  className,
  size = 32,
  delay = 0,
  duration = 14,
}: {
  icon: IconName;
  className: string;
  size?: number;
  delay?: number;
  duration?: number;
}) {
  return (
    <span
      className={`absolute text-brand-500/20 ${className}`}
      style={{
        animation: `gutter-float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <Icon name={icon} size={size} strokeWidth={1.25} />
    </span>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
              R
            </span>
            <span className="font-display text-base font-semibold text-ink-900">Roomora</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="btn btn-md text-ink-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* floating decorative icons */}
        <FloatingIcon icon="home" className="left-[8%] top-[12%]" size={40} delay={0} duration={16} />
        <FloatingIcon icon="building" className="right-[10%] top-[18%]" size={36} delay={2} duration={18} />
        <FloatingIcon icon="key" className="left-[15%] top-[55%]" size={28} delay={1} duration={12} />
        <FloatingIcon icon="bed" className="right-[12%] top-[60%]" size={32} delay={3} duration={14} />
        <FloatingIcon icon="plant" className="left-[6%] top-[80%]" size={26} delay={2.5} duration={15} />
        <FloatingIcon icon="door" className="right-[8%] top-[85%]" size={30} delay={1.5} duration={13} />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28 lg:py-36">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Icon name="sparkles" size={14} />
            AI-assisted tenant screening
          </span>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
            One calm place for
            <br />
            <span className="text-brand-600">properties, tenants</span> and{' '}
            <span className="text-brand-600">rent</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600">
            Manage rental properties with intelligent screening, automatic lease creation,
            payment tracking, maintenance workflows, and proactive warnings — all in one
            modern platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="btn-primary h-11 px-6 text-base">
              Start free trial
              <Icon name="arrowUpRight" size={16} />
            </Link>
            <Link
              to="/login"
              className="btn-secondary h-11 px-6 text-base"
            >
              Sign in to demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-400">
            No credit card required · Demo accounts available
          </p>
        </div>
      </section>

      {/* ── Workflow strip ─────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
            How it works
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { step: '1', label: 'Owner opens applications' },
              { step: '2', label: 'Tenant applies & uploads docs' },
              { step: '3', label: 'AI screening (advisory)' },
              { step: '4', label: 'Owner approves → lease created' },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {s.step}
                </span>
                <span className="text-sm font-medium text-ink-700">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Everything you need to manage rentals
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-500">
              From applications to payments to maintenance — streamlined workflows with
              intelligent assistance and automatic alerts.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-pop"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  <Icon name={f.icon} size={20} />
                </span>
                <h3 className="font-display text-base font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Three dedicated workspaces
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-500">
              Each role gets a tailored experience with only the features they need.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {roles.map((r) => (
              <div
                key={r.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center"
              >
                <span
                  className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ring-1 ${r.color}`}
                >
                  <Icon name={r.icon} size={22} />
                </span>
                <h3 className="font-display text-lg font-semibold text-ink-900">{r.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI callout ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-cream-50">
            <div className="grid gap-8 p-8 sm:grid-cols-2 sm:p-10">
              <div>
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  <Icon name="sparkles" size={12} />
                  NVIDIA NIM
                </span>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  AI that advises, never decides
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Our AI assesses eligibility, extracts document data, and checks for
                  inconsistencies — but the owner always makes the final call. Every result
                  shows whether it came from the AI or the rule-based fallback.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-ink-600">
                  {[
                    'Eligibility scoring with reasons',
                    'Document extraction & consistency check',
                    'Application summary generation',
                    'Maintenance classification & priority',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-brand-200/30 blur-2xl" />
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-pop">
                    <Icon name="bot" size={56} className="text-brand-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
            Ready to simplify your rental management?
          </h2>
          <p className="mt-3 text-ink-500">
            Try the demo with pre-seeded data, or create your own account.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="btn-primary h-11 px-6">
              Create account
            </Link>
            <Link to="/login" className="btn-secondary h-11 px-6">
              Sign in to demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-xs font-bold text-white">
              R
            </span>
            <span className="font-display text-sm font-semibold text-ink-700">Roomora</span>
          </div>
          <p className="text-xs text-ink-400">
            Smart rental management with AI-assisted screening · Demo environment
          </p>
        </div>
      </footer>
    </div>
  );
}
