import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { assetUrl } from '../lib/api';

/* ------------------------------------------------------------------ *
 * Confirm dialog: for destructive actions (delete / deactivate)      *
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white" onClick={(e) => e.stopPropagation()}>
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
 * Page scaffolding: gives every screen a clear header and sections   *
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
 * Metrics: a small number of prominent figures, with context        *
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

/** Prominent headline metric: use 3–4 of these at the top of a dashboard. */
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

/** Compact secondary figure: for supporting breakdowns, not headlines. */
export function StatLine({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-sm font-semibold ${toneText[tone]}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status: one solid, well-spaced pill per row. A tone dot inside a   *
 * soft-tinted capsule with a matching hairline. Never all-caps.       *
 * ------------------------------------------------------------------ */

type StatusTone = 'positive' | 'progress' | 'warning' | 'critical' | 'neutral';

const TONE_DOT: Record<StatusTone, string> = {
  positive: 'bg-emerald-500',
  progress: 'bg-violet-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
  neutral: 'bg-slate-400',
};
const TONE_PILL: Record<StatusTone, string> = {
  positive: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  progress: 'bg-violet-50 text-violet-800 ring-violet-600/15',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/15',
  critical: 'bg-rose-50 text-rose-800 ring-rose-600/15',
  neutral: 'bg-slate-50 text-ink-600 ring-slate-500/15',
};

const STATUS_TONE: Record<string, StatusTone> = {
  // payments
  PAID: 'positive', PENDING: 'neutral', PARTIAL: 'warning', OVERDUE: 'critical', WAIVED: 'neutral',
  // applications
  APPROVED: 'positive', REJECTED: 'critical', WITHDRAWN: 'neutral', DRAFT: 'neutral', SUBMITTED: 'neutral',
  DOCS_PENDING: 'warning', UNDER_AI_REVIEW: 'progress', AI_COMPLETE: 'progress', OWNER_REVIEW: 'progress',
  // tasks
  OPEN: 'warning', ASSIGNED: 'progress', IN_PROGRESS: 'progress', ON_HOLD: 'neutral',
  COMPLETED: 'positive', CANCELLED: 'neutral', SCHEDULED: 'neutral', MISSED: 'critical',
  // leases
  EXPIRED: 'neutral', TERMINATED: 'critical',
  // warnings
  ACTIVE: 'critical', ACKNOWLEDGED: 'warning', RESOLVED: 'positive', DISMISSED: 'neutral',
  // priority
  LOW: 'neutral', MEDIUM: 'warning', HIGH: 'warning', URGENT: 'critical', CRITICAL: 'critical', INFO: 'neutral',
};

/** "DOCS_PENDING" -> "Docs pending", but keep AI as an acronym. */
function humanizeStatus(value: string): string {
  return value
    .split('_')
    .map((w, i) =>
      w === 'AI' ? 'AI' : i === 0 ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase(),
    )
    .join(' ');
}

/**
 * The single status pill for a row: a tinted capsule, a tone dot (pulsing
 * for a live state), and a sentence-case label. Use exactly one per item.
 */
export function StatusPill({ value }: { value: string }) {
  const tone = STATUS_TONE[value] ?? 'neutral';
  const live = tone === 'critical' || value === 'IN_PROGRESS' || value === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONE_PILL[tone]}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {live && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${TONE_DOT[tone]}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      </span>
      {humanizeStatus(value)}
    </span>
  );
}

/**
 * A compact priority marker for the title area: a coloured triangle/flag
 * glyph + label, only shown when it's worth flagging (MEDIUM and up).
 */
export function PriorityFlag({ value }: { value: string }) {
  const tone = STATUS_TONE[value] ?? 'neutral';
  if (tone === 'neutral') return null; // LOW / unknown: not worth the ink
  const color =
    tone === 'critical' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-ink-500';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon name="alert" size={12} />
      {humanizeStatus(value)}
    </span>
  );
}

/** Back-compat alias: prefer <StatusPill>. */
export const Badge = ({ children }: { children: string }) => <StatusPill value={children} />;

/* ------------------------------------------------------------------ *
 * FilterSelect: a dropdown that filters a list by one or more values *
 * ------------------------------------------------------------------ */

export interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

/**
 * A compact filter dropdown. `selected` is a Set of chosen values; an empty
 * Set means "all". Click toggles a value; the trigger summarises the state
 * ("All" / one label / "N selected"). Closes on outside-click or Escape.
 */
export function FilterSelect({
  label = 'Filter',
  options,
  selected,
  onChange,
  align = 'right',
}: {
  label?: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (v: string) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange(next);
  };

  const labelFor = (o: FilterOption) =>
    o.label ?? o.value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  const summary =
    selected.size === 0
      ? 'All'
      : selected.size === 1
        ? labelFor(options.find((o) => selected.has(o.value)) ?? { value: [...selected][0] })
        : `${selected.size} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
          selected.size
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-slate-300 bg-white text-ink-700 hover:border-slate-400'
        }`}
      >
        <Icon name="filter" size={14} className={selected.size ? 'text-brand-600' : 'text-ink-400'} />
        <span className="text-ink-400">{label}:</span>
        <span className="capitalize">{summary}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={13} className="text-ink-400" />
      </button>

      {open && (
        <div
          className={`absolute z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-ink-600 hover:bg-slate-50"
          >
            <span className="font-medium">All</span>
            {selected.size === 0 && <Icon name="check" size={14} className="text-brand-600" />}
          </button>
          <div className="my-1 border-t border-slate-100" />
          {options.map((o) => {
            const on = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                    on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {on && <Icon name="check" size={11} />}
                </span>
                <span className="flex-1 capitalize text-ink-700">{labelFor(o)}</span>
                {o.count != null && (
                  <span className="text-xs tabular-nums text-ink-400">{o.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Neutral label chip (categories, tags): not a status. A hairline-outlined
 * tag with a leading hash, so it reads as metadata rather than a button.
 */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[3px] border border-slate-200 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-500">
      <span className="text-ink-300">#</span>
      {children}
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
 * Plain numeric text field: no browser spinner, numeric keypad on mobile,
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

/**
 * Multi-image picker with thumbnail previews. Holds `File[]` in the parent;
 * the caller appends them to a FormData on submit. Rejects non-images and
 * anything over `maxMB`. Shows a remove button per thumbnail.
 */
export function ImagePicker({
  files,
  onChange,
  label = 'Photos',
  hint = 'JPG, PNG or WebP · up to 10 images',
  max = 10,
  maxMB = 8,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
  max?: number;
  maxMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const add = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);
    const bad = incoming.find((f) => !f.type.startsWith('image/'));
    if (bad) return setError(`"${bad.name}" is not an image`);
    const tooBig = incoming.find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) return setError(`"${tooBig.name}" is larger than ${maxMB} MB`);
    const merged = [...files, ...incoming].slice(0, max);
    if (files.length + incoming.length > max) setError(`Only the first ${max} images are kept`);
    onChange(merged);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
              aria-label="Remove image"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600"
          >
            <Icon name="plus" size={18} />
            <span className="text-2xs font-medium">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      {error ? (
        <p className="field-hint text-rose-600">{error}</p>
      ) : (
        <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

/**
 * Read-only gallery for images already stored on a property/room. `images`
 * is the API shape `{ id, url, name }[]`. Compact strip by default; pass
 * `size="lg"` for a browse hero.
 */
export function ImageGallery({
  images,
  size = 'sm',
  className = '',
}: {
  images: { id: string; url: string; name?: string }[];
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const box = size === 'lg' ? 'h-48 sm:h-60' : 'h-24';
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className={className}>
      <div className={`overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${box}`}>
        <img src={assetUrl(current.url)} alt={current.name ?? ''} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`h-10 w-10 overflow-hidden rounded-md border transition-colors ${
                i === active ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <img src={assetUrl(img.url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
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

/** Skeleton block: reserves layout space while data loads. */
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
 * Table wrapper: horizontal scroll on small screens                 *
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
  if (!d) return '-';
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
