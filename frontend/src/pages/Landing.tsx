import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import FeatureJourney from '../components/FeatureJourney';
import { warmApi } from '../lib/api';
import './Landing.css';

interface RoleConfig {
  icon: IconName;
  title: string;
  tagline: string;
  action: string;
  summary: string;
  highlights: { icon: IconName; text: string }[];
  metric: {
    label: string;
    value: string;
    badge: string;
  };
  windowUrl: string;
  breadcrumb: string;
  menu: { name: string; icon: IconName; badge?: string }[];
  activeMenuIndex: number;
}

const roles: RoleConfig[] = [
  {
    icon: 'key',
    title: 'Owner',
    tagline: 'Properties & leases',
    action: 'A clear view of every property.',
    summary: 'Screen applicants, approve leases in seconds, and track rent with zero friction.',
    highlights: [
      { icon: 'sparkles', text: 'AI screening with instant risk scoring' },
      { icon: 'file', text: '1-click digital lease drafting & signing' },
      { icon: 'wallet', text: 'Real-time rent ledger & payment alerts' },
    ],
    metric: {
      label: 'Portfolio Occupancy',
      value: '96.4%',
      badge: '24 / 25 Units Active',
    },
    windowUrl: 'roomora.app/workspace/owner',
    breadcrumb: 'Maple Residency · Suite 102',
    menu: [
      { name: 'Overview', icon: 'dashboard' },
      { name: 'Applications', icon: 'file', badge: '3' },
      { name: 'Properties', icon: 'building' },
      { name: 'Rent Ledger', icon: 'wallet' },
    ],
    activeMenuIndex: 1,
  },
  {
    icon: 'home',
    title: 'Tenant',
    tagline: 'Rent & home hub',
    action: 'Everything about your home, together.',
    summary: 'Find verified rooms, sign leases digitally, set autopay, and request quick fixes.',
    highlights: [
      { icon: 'wallet', text: 'Seamless UPI autopay & instant receipts' },
      { icon: 'file', text: 'Verified digital lease & deposit escrow' },
      { icon: 'wrench', text: '1-tap photo repair requests & live updates' },
    ],
    metric: {
      label: 'Upcoming Rent',
      value: '₹15,000',
      badge: 'Due in 5 days · Autopay ON',
    },
    windowUrl: 'roomora.app/workspace/tenant',
    breadcrumb: 'Maple Residency · Room 102',
    menu: [
      { name: 'My Tenancy', icon: 'home' },
      { name: 'Payments', icon: 'wallet' },
      { name: 'Documents', icon: 'file' },
      { name: 'Repairs', icon: 'wrench' },
    ],
    activeMenuIndex: 0,
  },
  {
    icon: 'users',
    title: 'Staff',
    tagline: 'Field operations',
    action: 'The day’s work, easy to follow.',
    summary: 'Auto-routed work orders, photo proof uploads, and live resolution tracking.',
    highlights: [
      { icon: 'wrench', text: 'Prioritized dispatch feed with urgency tags' },
      { icon: 'camera', text: 'Before & after photo proof verification' },
      { icon: 'check', text: 'Clear resolution timers & tenant alerts' },
    ],
    metric: {
      label: 'Tasks Resolved',
      value: '18 / 20',
      badge: '98% on-time SLA',
    },
    windowUrl: 'roomora.app/workspace/staff',
    breadcrumb: 'Maple Residency · Field Dispatch',
    menu: [
      { name: 'Work Orders', icon: 'wrench', badge: '1' },
      { name: 'Turnovers', icon: 'broom' },
      { name: 'Inspections', icon: 'camera' },
      { name: 'History', icon: 'check' },
    ],
    activeMenuIndex: 0,
  },
];

const workflowSteps: { title: string; description: string; image: string }[] = [
  {
    title: 'List & invite',
    description: 'Select a room and open applications.',
    image: '/images/step-listing.jpg',
  },
  {
    title: 'Apply digitally',
    description: 'Tenants submit details and KYC in one place.',
    image: '/images/step-application.jpg',
  },
  {
    title: 'AI screening',
    description: 'Instant checks highlight low-risk applicants.',
    image: '/images/step-review.jpg',
  },
  {
    title: 'Sign & lease',
    description: 'Approve in 1 click with legally binding e-signatures.',
    image: '/images/step-lease.jpg',
  },
];

export default function Landing() {
  useEffect(() => { warmApi(); }, []);
  const landingRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const introBrandRef = useRef<HTMLSpanElement>(null);
  const [introActive, setIntroActive] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!introActive) return;
    const overlay = introRef.current;
    const wordmark = introBrandRef.current;
    const target = brandRef.current;
    if (!overlay || !wordmark || !target) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const content = Array.from(landingRef.current?.children ?? []).filter((element) => element !== overlay);
    content.forEach((element) => element.setAttribute('inert', ''));
    const animations: Animation[] = [];
    let cancelled = false;
    const finish = () => setIntroActive(false);
    preference.addEventListener('change', finish);

    const play = async () => {
      try {
        // Measure after fonts settle so the moving wordmark lands exactly on the navbar.
        await document.fonts.ready;
        if (cancelled) return;
        const entrance = wordmark.animate([
          { opacity: 0, transform: 'translateY(14px) scale(0.96)', filter: 'blur(6px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        ], { duration: 850, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
        animations.push(entrance);
        await entrance.finished;
        if (cancelled) return;
        const start = wordmark.getBoundingClientRect();
        const end = target.getBoundingClientRect();
        const flight = wordmark.animate([
          { transform: 'translate(0, 0) scale(1)' },
          { transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(${end.width / start.width})` },
        ], { delay: 250, duration: 1000, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' });
        animations.push(flight);
        await flight.finished;
        if (cancelled) return;
        const reveal = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards',
        });
        animations.push(reveal);
        // Hand the wordmark to the navbar before fading away the black screen.
        target.style.visibility = 'visible';
        await reveal.finished;
        if (!cancelled) finish();
      } catch {
        if (!cancelled) finish();
      }
    };
    void play();
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
      document.body.style.overflow = previousOverflow;
      content.forEach((element) => element.removeAttribute('inert'));
      target.style.visibility = '';
      preference.removeEventListener('change', finish);
    };
  }, [introActive]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const aiSectionRef = useRef<HTMLElement>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [activeRole, setActiveRole] = useState(0);
  // The extra copies let the deck wrap without jumping back across the screen.
  const [deckSlot, setDeckSlot] = useState(workflowSteps.length);
  const [deckTransition, setDeckTransition] = useState(true);
  const [deckPaused, setDeckPaused] = useState(false);
  const activeStep = deckSlot % workflowSteps.length;

  const moveStep = (direction: number) => {
    setDeckSlot((current) => current + direction);
  };

  useEffect(() => {
    if (deckPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => moveStep(1), 2000);
    return () => window.clearTimeout(timer);
  }, [activeStep, deckPaused]);

  useEffect(() => {
    if (deckSlot > workflowSteps.length - 1 && deckSlot < workflowSteps.length * 2) return;
    const timer = window.setTimeout(() => {
      setDeckTransition(false);
      setDeckSlot(deckSlot < workflowSteps.length ? deckSlot + workflowSteps.length : deckSlot - workflowSteps.length);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setDeckTransition(true)));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [deckSlot]);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePlayback = () => {
      if (motionPreference.matches) videoRef.current?.pause();
      else void videoRef.current?.play().catch(() => {});
    };
    updatePlayback();
    motionPreference.addEventListener('change', updatePlayback);
    return () => motionPreference.removeEventListener('change', updatePlayback);
  }, []);

  useEffect(() => {
    const section = aiSectionRef.current;
    if (!section) return;
    if (!('IntersectionObserver' in window)) {
      setAiVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAiVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={landingRef} className={`landing-page min-h-screen bg-[#f7f7f2] ${introActive ? 'roomora-intro-active' : ''}`}>
      {introActive && (
        <div ref={introRef} className="roomora-intro" aria-hidden="true">
          <div className="roomora-intro-icons">
            {[
              { name: 'home', left: '15%', top: '19%', size: 72, rotation: -12 },
              { name: 'key', left: '46%', top: '13%', size: 42, rotation: 15 },
              { name: 'building', left: '78%', top: '24%', size: 64, rotation: 8 },
              { name: 'plant', left: '8%', top: '54%', size: 46, rotation: -8 },
              { name: 'door', left: '86%', top: '58%', size: 48, rotation: 12 },
              { name: 'sofa', left: '24%', top: '77%', size: 62, rotation: -6 },
              { name: 'lamp', left: '54%', top: '84%', size: 40, rotation: 10 },
              { name: 'home', left: '73%', top: '74%', size: 52, rotation: -10 },
            ].map((item, index) => (
              <span key={`${item.name}-${index}`} className="roomora-intro-icon" style={{ left: item.left, top: item.top, rotate: `${item.rotation}deg`, animationDelay: `${index * 55}ms` }}>
                <Icon name={item.name} size={item.size} strokeWidth={1.1} />
              </span>
            ))}
          </div>
          <span ref={introBrandRef} className="roomora-intro-wordmark font-wordmark font-bold tracking-tight text-white">Roomora</span>
        </div>
      )}
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#142c23]">
        <header className="absolute inset-x-0 top-0 z-30">
          <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6" aria-label="Main navigation">
            <span ref={brandRef} style={{ visibility: introActive ? 'hidden' : 'visible' }} className="font-wordmark text-3xl font-bold tracking-tight text-white">Roomora</span>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="btn h-11 px-4 text-base text-white hover:bg-white/15 sm:h-12 sm:px-6">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary h-11 px-5 text-base sm:h-12 sm:px-7">
                Get started
              </Link>
            </div>
          </nav>
        </header>
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#10251d]/60 via-[#10251d]/65 to-[#10251d]/85"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-4 pt-20 text-center sm:pt-24">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            One calm place for
            <br />
            <span className="text-brand-300">properties, tenants</span> and{' '}
            <span className="text-brand-300">rent</span>
          </h1>
          <p className="mobile-secondary-copy mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            Intelligent applicant screening, 1-click digital leases, and automated rent tracking in one calm platform.
          </p>
        </div>
        <div className="relative z-10 mt-8 flex justify-center pb-24 sm:pb-28">
          <a
            href="#how-it-works"
            className="flex w-fit flex-col items-center gap-1 text-sm font-medium text-white"
          >
            <span>Scroll down</span>
            <svg
              className="h-6 w-6 animate-bounce motion-reduce:animate-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 6 6 6 6-6M6 12l6 6 6-6" />
            </svg>
          </a>
        </div>
        <svg
          className="pointer-events-none absolute bottom-0 left-0 z-0 h-16 w-full text-white sm:h-24"
          viewBox="0 0 1440 144"
          preserveAspectRatio="none"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 144 Q720 -20 1440 144 Z" />
        </svg>
      </section>

      {/* ── Workflow card deck ─────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-14 bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">How it works</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              From listing to lease, one step at a time
            </h2>
          </div>

          <div
            className="relative pb-4"
            onMouseEnter={() => setDeckPaused(true)}
            onMouseLeave={() => setDeckPaused(false)}
            onFocusCapture={() => setDeckPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDeckPaused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveStep(-1);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveStep(1);
              }
            }}
          >
            <div className="relative mx-auto h-[300px] max-w-[1120px] overflow-hidden sm:h-[490px]">
              {Array.from({ length: workflowSteps.length * 3 }, (_, slot) => {
                const position = slot - deckSlot;
                if (Math.abs(position) > 2) return null;
                const index = slot % workflowSteps.length;
                const step = workflowSteps[index];
                const active = position === 0;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => moveStep(position)}
                    aria-label={`Show step ${index + 1}: ${step.title}`}
                    aria-current={active ? 'step' : undefined}
                    tabIndex={Math.abs(position) <= 1 ? 0 : -1}
                    aria-hidden={Math.abs(position) > 1}
                    className={`group absolute left-1/2 top-1/2 flex h-[270px] w-[64vw] max-w-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.16)] sm:h-[430px] sm:p-8 ${deckTransition ? 'transition-[transform,opacity] duration-500 ease-in-out motion-reduce:transition-none' : ''}`}
                    style={{
                      zIndex: 10 - Math.abs(position),
                      opacity: Math.abs(position) > 1 ? 0 : 1,
                      pointerEvents: Math.abs(position) > 1 ? 'none' : 'auto',
                      transform: `translate(-50%, -50%) translateX(${position * 63}%) rotate(${position * 8}deg) scale(${active ? 1 : 0.94})`,
                    }}
                  >
                    <img
                      src={step.image}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-[opacity,transform] duration-500 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#10251d]/45 to-[#10251d]/85 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
                    <span className={`relative z-10 font-display text-3xl font-semibold leading-none text-brand-700 transition-colors duration-500 group-hover:text-white group-focus-visible:text-white sm:text-5xl ${active ? 'self-start' : 'self-center'}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="relative z-10 my-auto block w-full">
                      <span className="block font-display text-base font-semibold leading-tight text-ink-900 transition-colors duration-500 group-hover:text-white group-focus-visible:text-white sm:text-3xl lg:text-4xl">{step.title}</span>
                      <span className="mt-3 hidden text-lg leading-relaxed text-ink-600 transition-colors duration-500 group-hover:text-white/90 group-focus-visible:text-white/90 sm:block">{step.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative z-40 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => moveStep(-1)}
                aria-label="Previous step"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-ink-700 transition-colors hover:bg-slate-200"
              >
                <span aria-hidden="true">←</span>
              </button>
              <span className="min-w-20 text-center text-sm font-medium tabular-nums text-ink-700" aria-live="polite">
                {activeStep + 1} / {workflowSteps.length}
              </span>
              <button
                type="button"
                onClick={() => moveStep(1)}
                aria-label="Next step"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-ink-700 transition-colors hover:bg-slate-200"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <FeatureJourney />

      {/* ── Roles: Made for every role ──────────────────────────────── */}
      <section className="landing-roles relative isolate overflow-hidden bg-gradient-to-b from-[#0e271f] via-[#0b211a] to-[#0a1e17] px-4 py-20 sm:px-6 sm:py-28">
        {/* Luminous top boundary beam */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a8db8b]/60 to-transparent" />
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#76c457]/20 via-[#4e8b38]/10 to-transparent blur-3xl" />

        {/* Subtle grid pattern background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(168,219,139,0.2) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a8db8b] animate-pulse" />
              Made for every role
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-5xl tracking-tight max-w-2xl">
              A workspace that fits your day.
            </h2>
            <p className="mt-3 max-w-lg text-sm text-white/70 leading-relaxed sm:text-base">
              Purpose-built clarity for owners, residents, and field operations.
            </p>
          </div>

          {/* Role Switcher Dock */}
          <div
            className="mt-10 mx-auto max-w-2xl grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            role="tablist"
            aria-label="Choose a workspace"
          >
            {roles.map((role, index) => {
              const active = activeRole === index;
              return (
                <button
                  key={role.title}
                  type="button"
                  role="tab"
                  id={`workspace-tab-${index}`}
                  aria-selected={active}
                  aria-controls="workspace-panel"
                  onClick={() => setActiveRole(index)}
                  className={`group relative flex flex-col items-start rounded-xl px-3 py-3 sm:px-4 sm:py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    active
                      ? 'bg-gradient-to-br from-[#bdf59e] to-[#91d670] text-[#0d281e] shadow-[0_8px_25px_rgba(168,219,139,0.35)]'
                      : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? 'bg-[#0f2e24] text-[#bdf59e]'
                        : 'bg-white/10 text-white/80 group-hover:bg-white/15 group-hover:text-white'
                    }`}
                  >
                    <Icon name={role.icon} size={16} />
                  </span>
                  <span className="mt-2.5 font-display text-sm font-bold tracking-tight sm:text-base">
                    {role.title}
                  </span>
                  <span
                    className={`text-[11px] ${
                      active ? 'text-[#133d2f] font-medium' : 'text-white/45'
                    }`}
                  >
                    {role.tagline}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Studio Stage Card */}
          <div
            id="workspace-panel"
            role="tabpanel"
            aria-labelledby={`workspace-tab-${activeRole}`}
            key={activeRole}
            className="feature-stage-in mt-8 overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-[#113328]/95 via-[#0c261e]/95 to-[#081b15]/95 p-6 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] sm:p-8 lg:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
              {/* Left Column: Minimalist Capabilities */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/25 bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                    <Icon name={roles[activeRole].icon} size={12} />
                    {roles[activeRole].title} View
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {roles[activeRole].action}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/70">
                    {roles[activeRole].summary}
                  </p>
                </div>

                {/* Scannable Feature List */}
                <div className="mt-5 space-y-2 sm:mt-7">
                  {roles[activeRole].highlights.map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2.5 text-xs sm:text-sm text-white/85"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-400/20 text-[#a8db8b]">
                        <Icon name={item.icon} size={13} />
                      </span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Compact Metric */}
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {roles[activeRole].metric.label}
                    </span>
                    <span className="font-display text-lg font-bold text-white sm:text-xl">
                      {roles[activeRole].metric.value}
                    </span>
                  </div>
                  <span className="rounded-full bg-brand-400/15 px-2.5 py-0.5 text-xs font-semibold text-[#a8db8b]">
                    {roles[activeRole].metric.badge}
                  </span>
                </div>
              </div>

              {/* Right Column: macOS Mockup Window */}
              <div
                className="overflow-hidden rounded-2xl border border-white/15 bg-[#091b15] shadow-[0_25px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)]"
                aria-label={`${roles[activeRole].title} preview`}
              >
                {/* Window Titlebar */}
                <div className="flex items-center justify-between border-b border-white/10 bg-[#0d251d] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] shadow-sm border border-[#e0443e]/40" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] shadow-sm border border-[#dea123]/40" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] shadow-sm border border-[#1aab29]/40" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-0.5 text-[11px] font-mono text-white/60">
                    <span className="text-[#a8db8b]">🔒</span>
                    <span>{roles[activeRole].windowUrl}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="hidden sm:inline">Live</span>
                  </div>
                </div>

                {/* Window Body */}
                <div className="grid min-h-[340px] sm:grid-cols-[135px_1fr]">
                  {/* Mini Sidebar */}
                  <div className="hidden border-r border-white/10 bg-[#081813] p-3 sm:flex sm:flex-col sm:justify-between">
                    <div>
                      <div className="mb-3 flex items-center justify-between px-2 pt-1">
                        <span className="font-wordmark text-[11px] font-bold text-white tracking-wider">ROOMORA</span>
                        <span className="rounded bg-brand-500/20 px-1 py-0.5 text-[9px] font-semibold text-brand-300">v2.4</span>
                      </div>
                      <nav className="space-y-1" aria-label="Mock navigation">
                        {roles[activeRole].menu.map((item, idx) => {
                          const isCurrent = idx === roles[activeRole].activeMenuIndex;
                          return (
                            <div
                              key={item.name}
                              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isCurrent
                                  ? 'bg-[#a8db8b] text-[#0d281e] font-semibold shadow-sm'
                                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Icon name={item.icon} size={13} />
                                {item.name}
                              </span>
                              {item.badge && (
                                <span
                                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                    isCurrent ? 'bg-[#0d281e] text-[#a8db8b]' : 'bg-white/10 text-white/70'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </nav>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[10px] text-white/50">
                      <div className="font-semibold text-white/80">Maple Residency</div>
                      <div>Room 102 · Active</div>
                    </div>
                  </div>

                  {/* Main Mock Viewport */}
                  <div className="bg-[#0b1f18] p-4 sm:p-5 text-white">
                    {/* Viewport Top Breadcrumb */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <span className="text-[10px] font-medium text-brand-300">
                          {roles[activeRole].breadcrumb}
                        </span>
                        <h4 className="font-display text-sm font-bold text-white sm:text-base">
                          {activeRole === 0 && 'Applicant Review'}
                          {activeRole === 1 && 'Rent & Tenancy Hub'}
                          {activeRole === 2 && 'Field Dispatch'}
                        </h4>
                      </div>
                      <span className="rounded-full border border-brand-400/30 bg-brand-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300">
                        {activeRole === 0 && 'Decision Pending'}
                        {activeRole === 1 && 'Lease Active'}
                        {activeRole === 2 && 'In Progress'}
                      </span>
                    </div>

                    {/* View-Specific Components */}
                    {activeRole === 0 && (
                      <div className="mt-3.5 space-y-3">
                        {/* AI Advisory Banner */}
                        <div className="flex items-center justify-between rounded-lg border border-brand-300/30 bg-brand-500/15 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[#a8db8b]">
                              <Icon name="sparkles" size={14} />
                            </span>
                            <span className="text-xs font-semibold text-[#bdf59e]">AI Advisory: Strong Candidate (Low Risk)</span>
                          </div>
                          <span className="rounded bg-brand-400 px-1.5 py-0.5 text-[10px] font-bold text-[#0d281e]">94% Match</span>
                        </div>

                        {/* Applicant Card */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#76c457] to-[#bdf59e] text-xs font-bold text-[#0d281e]">
                                AK
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white text-xs sm:text-sm">Avery Kapoor</span>
                                  <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] font-semibold text-emerald-300">Verified</span>
                                </div>
                                <span className="text-[10px] text-white/60">Software Engineer</span>
                              </div>
                            </div>
                            <span className="text-right">
                              <span className="block text-xs font-bold text-white">₹18,500/mo</span>
                              <span className="block text-[9px] text-white/45">Offer</span>
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2.5 text-center text-xs">
                            <div className="rounded bg-white/[0.03] py-1">
                              <span className="block text-[9px] text-white/45">Credit</span>
                              <span className="font-semibold text-white">760</span>
                            </div>
                            <div className="rounded bg-white/[0.03] py-1">
                              <span className="block text-[9px] text-white/45">Coverage</span>
                              <span className="font-semibold text-emerald-400">3.8x</span>
                            </div>
                            <div className="rounded bg-white/[0.03] py-1">
                              <span className="block text-[9px] text-white/45">Move-in</span>
                              <span className="font-semibold text-white">01 Nov</span>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="flex-1 rounded-lg bg-[#a8db8b] py-2 text-xs font-bold text-[#0d281e] hover:bg-white flex items-center justify-center gap-1"
                            >
                              <span>Approve & Lease</span>
                              <span aria-hidden="true">→</span>
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              Dossier
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeRole === 1 && (
                      <div className="mt-3.5 space-y-3">
                        {/* Tenant Payment Banner Card */}
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-white/[0.04] to-white/[0.02] p-3.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Next Rent</span>
                              <div className="mt-0.5 flex items-baseline gap-2">
                                <span className="font-display text-xl font-bold text-white sm:text-2xl">₹15,000</span>
                                <span className="text-[11px] text-brand-300">due 01 Aug</span>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                              Autopay Linked
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between rounded bg-black/20 px-2.5 py-1.5 text-xs text-white/70">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Icon name="wallet" size={13} />
                              HDFC UPI •••• 4291
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">Auto-debit</span>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="flex-1 rounded-lg bg-[#a8db8b] py-2 text-xs font-bold text-[#0d281e] hover:bg-white"
                            >
                              Pay Now ↗
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              Receipts
                            </button>
                          </div>
                        </div>

                        {/* Tenancy Amenities Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                            <span className="text-[9px] text-white/50 block">Lease Agreement</span>
                            <span className="font-semibold text-white text-[11px] block">Active till Jul 2027</span>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                            <span className="text-[9px] text-white/50 block">Maintenance Help</span>
                            <span className="font-semibold text-emerald-400 text-[11px] block">0 Open Requests</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeRole === 2 && (
                      <div className="mt-3.5 space-y-3">
                        {/* Staff Active Ticket Card */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 uppercase">
                                  Urgent
                                </span>
                                <span className="text-[11px] text-white/45 font-mono">#WO-084</span>
                              </div>
                              <h5 className="mt-1 font-display text-xs sm:text-sm font-bold text-white">
                                AC Not Cooling Below 26°C
                              </h5>
                              <p className="text-[10px] text-white/60">
                                Room 102 · Avery Kapoor
                              </p>
                            </div>
                            <span className="rounded bg-brand-400/20 px-2 py-0.5 text-[9px] font-semibold text-brand-300">
                              45m SLA
                            </span>
                          </div>

                          {/* Stepper */}
                          <div className="mt-3 rounded bg-black/25 p-2.5">
                            <div className="flex items-center justify-between text-[10px] font-medium text-white/60 mb-1.5">
                              <span className="text-emerald-400">1. Reported ✓</span>
                              <span className="text-emerald-400">2. Assigned ✓</span>
                              <span className="text-[#a8db8b] font-bold">3. On-Site ●</span>
                              <span>4. Solved</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-3/4 rounded-full bg-[#a8db8b]" />
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="flex-1 rounded-lg bg-[#a8db8b] py-2 text-xs font-bold text-[#0d281e] hover:bg-white flex items-center justify-center gap-1"
                            >
                              <Icon name="camera" size={13} />
                              <span>Attach Photo</span>
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI review workflow ──────────────────────────────────────── */}
      <section ref={aiSectionRef} className="bg-[#f7f7f2] px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#123d31] text-white shadow-[0_24px_60px_rgba(18,61,49,0.2)]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-10 p-7 sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:p-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">Thoughtful automation</p>
              <h2 className="mt-4 max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl">
                AI gives the insight. You make the call.
              </h2>
              <p className="mobile-secondary-copy mt-4 max-w-md text-base leading-relaxed text-white/75">
                AI highlights eligibility checks and risk summaries — the final decision is always yours.
              </p>
            </div>

            <div className="relative rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-4 shadow-inner sm:p-6" aria-label="Illustration of an application review workflow">
              <div className="mb-5 border-b border-white/15 pb-4">
                <span className="text-sm font-semibold">Application review</span>
              </div>
              <div className="relative space-y-3">
                <div className="ai-flow-track absolute bottom-8 left-5 top-8 w-px bg-white/15 sm:left-6" aria-hidden="true">
                  <span className={aiVisible ? 'ai-flow-travel' : 'hidden'} />
                </div>
                {[
                  { icon: 'file' as IconName, step: '01', title: 'Application received', detail: 'Documents unified in one place', tone: 'text-white/70' },
                  { icon: 'sparkles' as IconName, step: '02', title: 'AI prepares insights', detail: 'Instant scoring and risk flags', tone: 'text-brand-300' },
                  { icon: 'key' as IconName, step: '03', title: 'You review & decide', detail: 'Full control remains with you', tone: 'text-white' },
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className={`relative flex items-center gap-4 rounded-xl border border-white/10 bg-[#174b3a] p-3 sm:p-4 ${aiVisible ? 'ai-flow-enter' : 'opacity-0'}`}
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ${item.tone} sm:h-12 sm:w-12`}>
                      <Icon name={item.icon} size={23} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold sm:text-base">{item.title}</span>
                      <span className="mobile-secondary-copy block text-xs text-white/60 sm:text-sm">{item.detail}</span>
                    </span>
                    <span className="self-start text-xs font-medium tabular-nums text-white/35">{item.step}</span>
                    {index === 1 && <span className={aiVisible ? 'ai-flow-scan' : 'hidden'} aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <p className="mobile-secondary-copy mt-5 text-center text-xs text-white/55">The AI advises. The owner decides.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing invitation ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#123d31] text-white" aria-labelledby="closing-title">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(197,229,173,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(197,229,173,.18) 1px, transparent 1px)', backgroundSize: '76px 76px' }} aria-hidden="true" />
        <div className="pointer-events-none absolute -right-40 bottom-10 -z-10 h-[540px] w-[540px] rounded-full border border-[#c5e5ad]/20 sm:-right-24" aria-hidden="true">
          <div className="absolute inset-14 rounded-full border border-[#c5e5ad]/20" />
          <div className="absolute inset-28 rounded-full border border-[#c5e5ad]/20" />
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28 lg:pt-36">
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#c5e5ad]">
            <span className="h-px w-10 bg-[#c5e5ad]" aria-hidden="true" />
            Your next chapter
          </div>
          <div className="mt-8 grid gap-10 border-b border-white/25 pb-20 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:gap-16 lg:pb-28">
            <h2 id="closing-title" className="max-w-3xl font-display text-[clamp(3.25rem,7vw,6.75rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              More room for<br /><span className="text-[#b6df9a]">what matters.</span>
            </h2>
            <div className="max-w-md lg:pb-2">
              <p className="mobile-secondary-copy text-lg leading-relaxed text-white/75 sm:text-xl">
                Bring your properties, people and everyday work into one calm place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-[#b6df9a] px-6 py-3 text-sm font-semibold text-[#123d31] transition-colors hover:bg-white focus-visible:ring-[#b6df9a]">
                  Create your account <span aria-hidden="true">↗</span>
                </Link>
                <Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg border border-white/45 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:ring-white">
                  Sign in <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-10">
          <div>
            <Link to="/" className="font-wordmark text-3xl font-bold tracking-tight text-white sm:text-4xl">Roomora</Link>
            <p className="mobile-secondary-copy mt-2 text-sm text-white/55">A better way to keep rentals moving.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/70">
            <Link to="/login" className="hover:text-white">Sign in</Link>
            <Link to="/register" className="hover:text-white">Get started</Link>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
          </nav>
        </footer>
      </section>
    </div>
  );
}
