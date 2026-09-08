import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/* ------------------------------------------------------------------ *
 * Confirm dialog — for destructive actions (delete / deactivate)      *
 * ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                danger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Icon name="alert" size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
              <p className="mt-1 text-sm text-ink-500">{message}</p>
            </div>
          </div>
          {error && (
            <div className="mt-3">
              <ErrorBanner message={error} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3">
          <button className="btn-secondary btn-sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn-sm ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page scaffolding — gives every screen a clear header and sections   *
 * ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-ink-500" aria-label="Breadcrumb">
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.to ? (
                <Link to={c.to} className="hover:text-ink-700">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-700">{c.label}</span>
              )}
              {i < breadcrumb.length - 1 && <Icon name="chevronRight" size={12} className="text-ink-400" />}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Two-column page body: a sticky left rail (filters, counts, quick facts) and
 * the main content on the right. Collapses to one column below lg.
 */
export function SplitLayout({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4">{aside}</div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A labelled group of counts for the left rail. */
export function RailStats({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: ReactNode; tone?: 'default' | 'positive' | 'warning' | 'critical' }[];
}) {
  return (
    <div className="card">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-ink-500">{r.label}</span>
            <span
              className={`text-sm font-semibold ${
                r.tone === 'critical'
                  ? 'text-rose-600'
                  : r.tone === 'warning'
                    ? 'text-amber-600'
                    : r.tone === 'positive'
                      ? 'text-emerald-600'
                      : 'text-ink-900'
              }`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A vertical list of filter buttons for the left rail. */
export function RailFilters<T extends string>({
  title = 'Filter',
  value,
  onChange,
  options,
}: {
  title?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="card">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      <div className="space-y-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              value === o.value ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-slate-100'
            }`}
          >
            {o.label}
            {o.count != null && (
              <span
                className={`text-xs ${value === o.value ? 'text-brand-100' : 'text-ink-400'}`}
              >
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({
  children,
  className = '',
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return <div className={`card ${pad ? '' : 'card-flush'} ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Metrics — a small number of prominent figures, with context        *
 * ------------------------------------------------------------------ */

type Tone = 'default' | 'positive' | 'warning' | 'critical';

const toneText: Record<Tone, string> = {
  default: 'text-ink-900',
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-rose-600',
};
const toneAccent: Record<Tone, string> = {
  default: 'bg-slate-300',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
};

/** Prominent headline metric — use 3–4 of these at the top of a dashboard. */
export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  to,
  cta = 'View',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: IconName;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-pop">
      <span className={`absolute inset-y-0 left-0 w-1 ${toneAccent[tone]}`} aria-hidden="true" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <Icon name={icon} size={16} className="text-ink-400" />}
      </div>
      <p className={`mt-2 font-display text-3xl font-semibold ${toneText[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {to && (
        <Link
          to={to}
          className="mt-4 inline-flex h-8 items-center justify-center gap-1 self-start rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
        >
          {cta}
          <Icon name="chevronRight" size={13} />
        </Link>
      )}
    </div>
  );
}

/** Compact secondary figure — for supporting breakdowns, not headlines. */
export function StatLine({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-sm font-semibold ${toneText[tone]}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status — colour + icon + text, never colour alone                  *
 * ------------------------------------------------------------------ */

const STATUS: Record<string, { cls: string; icon?: IconName }> = {
  // payments
  PAID: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: 'check' },
  PENDING: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20', icon: 'clock' },
  PARTIAL: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: 'clock' },
  OVERDUE: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'alert' },
  WAIVED: { cls: 'bg-slate-100 text-ink-500 ring-slate-500/20' },
  // applications
  APPROVED: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: 'check' },
  REJECTED: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'x' },
  WITHDRAWN: { cls: 'bg-slate-100 text-ink-500 ring-slate-500/20' },
  DRAFT: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' },
  SUBMITTED: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' },
  DOCS_PENDING: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: 'file' },
  UNDER_AI_REVIEW: { cls: 'bg-violet-50 text-violet-700 ring-violet-600/20', icon: 'sparkles' },
  AI_COMPLETE: { cls: 'bg-violet-50 text-violet-700 ring-violet-600/20', icon: 'sparkles' },
  OWNER_REVIEW: { cls: 'bg-brand-50 text-brand-700 ring-brand-600/20', icon: 'clock' },
  // tasks
  OPEN: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  ASSIGNED: { cls: 'bg-brand-50 text-brand-700 ring-brand-600/20' },
  IN_PROGRESS: { cls: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  ON_HOLD: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' },
  COMPLETED: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: 'check' },
  CANCELLED: { cls: 'bg-slate-100 text-ink-500 ring-slate-500/20' },
  SCHEDULED: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20', icon: 'calendar' },
  MISSED: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'alert' },
  // warnings
  ACTIVE: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'alert' },
  ACKNOWLEDGED: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  RESOLVED: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: 'check' },
  DISMISSED: { cls: 'bg-slate-100 text-ink-500 ring-slate-500/20' },
  // priority
  LOW: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' },
  MEDIUM: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  HIGH: { cls: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  URGENT: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'alert' },
  CRITICAL: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', icon: 'alert' },
  INFO: { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' },
};

export function StatusPill({ value }: { value: string }) {
  const s = STATUS[value] ?? { cls: 'bg-slate-100 text-ink-600 ring-slate-500/20' };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${s.cls}`}
    >
      {s.icon && <Icon name={s.icon} size={11} />}
      {value.replaceAll('_', ' ')}
    </span>
  );
}

/** Back-compat alias — prefer <StatusPill>. */
export const Badge = ({ children }: { children: string }) => <StatusPill value={children} />;

/** Neutral label chip (categories, tags) — not a status. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-medium text-ink-600">
      {children}
    </span>
  );
}

/** Which engine produced an AI result. Always shown next to AI output. */
export function AiSourceTag({ source }: { source?: string | null }) {
  if (!source) return null;
  const nvidia = source === 'NVIDIA_AI';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
        nvidia ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
      }`}
      title="Which engine produced this result"
    >
      <Icon name="sparkles" size={11} />
      {nvidia ? 'NVIDIA AI' : 'Rule-Based'}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Forms                                                              *
 * ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/**
 * Plain numeric text field — no browser spinner, numeric keypad on mobile,
 * empty allowed while typing. `value` is a number; `onChange` gets a number
 * (0 when the field is cleared).
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowDecimal = false,
  className = '',
  ...rest
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={Number.isFinite(value) ? String(value) : ''}
      onChange={(e) => {
        const raw = e.target.value.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
        if (raw === '') return onChange(0);
        let n = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
        if (Number.isNaN(n)) return;
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        onChange(n);
      }}
      onBlur={(e) => {
        if (min != null && value < min) onChange(min);
        rest.onBlur?.(e);
      }}
      className={`input tabular-nums ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ *
 * States                                                             *
 * ------------------------------------------------------------------ */

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/** Skeleton block — reserves layout space while data loads. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export function EmptyState({
  icon = 'inbox',
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink-400">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function InlineNote({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  const cls =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-cream-200 bg-cream-100 text-ink-700';
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${cls}`}>
      <Icon name="info" size={14} className="mt-0.5 shrink-0 text-brand-600" />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Table wrapper — horizontal scroll on small screens                 *
 * ------------------------------------------------------------------ */

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">{children}</table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Formatting helpers                                                 *
 * ------------------------------------------------------------------ */

export function money(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function date(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relDays(d: string | Date): string {
  const diff = Math.round((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${-diff} days ago`;
}
