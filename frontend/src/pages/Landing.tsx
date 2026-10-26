import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import FeatureJourney from '../components/FeatureJourney';
import { warmApi } from '../lib/api';
import './Landing.css';

const roles: { icon: IconName; title: string; action: string; description: string; screen: string; subject: string; status: string; details: [string, string][]; menu: string[]; highlight: string }[] = [
  {
    icon: 'key',
    title: 'Owner',
    action: 'A clear view of every property.',
    description: 'Manage rooms, review applicants, approve leases, and keep rent and repairs in view.',
    screen: 'Application review',
    subject: 'Maple Residency · Room 102',
    status: 'Ready for decision',
    details: [['Applications', '03 received'], ['Documents', 'Checked']],
    menu: ['Overview', 'Properties', 'Applications', 'Payments'],
    highlight: '3 applications need review',
  },
  {
    icon: 'home',
    title: 'Tenant',
    action: 'Everything about your home, together.',
    description: 'Explore rooms, follow applications, access your lease, pay rent, and request help.',
    screen: 'My tenancy',
    subject: 'Maple Residency · Room 102',
    status: 'Lease active',
    details: [['Next payment', '₹15,000'], ['Due date', '01 Aug']],
    menu: ['Overview', 'Browse rooms', 'My lease', 'Payments'],
    highlight: 'Your next payment is due 01 Aug',
  },
  {
    icon: 'users',
    title: 'Staff',
    action: 'The day’s work, easy to follow.',
    description: 'See assigned maintenance and cleaning jobs, update their status, and add photos.',
    screen: 'Assigned task',
    subject: 'AC not cooling · Room 102',
    status: 'In progress',
    details: [['Task type', 'Maintenance'], ['Evidence', 'Photo upload']],
    menu: ['Overview', 'Maintenance', 'Cleaning', 'Completed'],
    highlight: '1 task is in progress',
  },
];

const workflowSteps: { title: string; description: string; image: string }[] = [
  {
    title: 'Owner opens applications',
    description: 'Choose a room and invite tenants to apply.',
    image: '/images/step-listing.jpg',
  },
  {
    title: 'Tenant applies and uploads documents',
    description: 'Applicants share their details and required documents in one place.',
    image: '/images/step-application.jpg',
  },
  {
    title: 'AI screening advises',
    description: 'Eligibility and document checks help the owner review each application.',
    image: '/images/step-review.jpg',
  },
  {
    title: 'Owner approves and creates a lease',
    description: 'The owner makes the final decision and assigns the tenant to a room.',
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
          <p className="mobile-secondary-copy mx-auto mt-6 max-w-2xl text-lg text-white/85">
            Manage rental properties with intelligent screening, automatic lease creation,
            payment tracking, maintenance workflows, and proactive warnings in one
            modern platform.
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

      {/* ── Roles ──────────────────────────────────────────────────── */}
      <section className="landing-roles border-t-[10px] border-[#a8db8b] bg-[#123d31] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">Made for every role</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">A workspace that fits your day.</h2>
            <p className="mobile-secondary-copy mt-4 text-white/70">Take a look inside Roomora from each point of view.</p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/15 bg-white/10 p-1.5 sm:gap-2 sm:p-2" role="tablist" aria-label="Choose a workspace">
            {roles.map((role, index) => (
              <button key={role.title} type="button" role="tab" id={`workspace-tab-${index}`} aria-selected={activeRole === index} aria-controls="workspace-panel" onClick={() => setActiveRole(index)} className={`group min-w-0 rounded-xl px-2 py-4 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 sm:px-6 sm:py-6 ${activeRole === index ? 'bg-[#a8db8b] text-[#143f32] shadow-[0_8px_20px_rgba(0,0,0,0.14)]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                <span className="flex items-center gap-2 sm:gap-3"><Icon name={role.icon} size={22} /><span className="font-display text-base font-semibold sm:text-xl">{role.title}</span></span>
                <span className={`mt-2 hidden text-xs sm:block ${activeRole === index ? 'text-[#22513c]' : 'text-white/55'}`}>{['Manage rentals', 'Manage your home', 'Manage your tasks'][index]}</span>
              </button>
            ))}
          </div>
          <div id="workspace-panel" role="tabpanel" aria-labelledby={`workspace-tab-${activeRole}`} key={activeRole} className="feature-stage-in mt-6 grid gap-10 rounded-[1.75rem] bg-[#f7f9f4] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.16)] sm:p-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16 lg:p-12">
            <div className="role-introduction">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{roles[activeRole].title} workspace</p>
              <h3 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">{roles[activeRole].action}</h3>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500">{roles[activeRole].description}</p>
              <div className="mt-8 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">At a glance</p>
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700"><span className="h-2 w-2 rounded-full bg-brand-600" />{roles[activeRole].highlight}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(24,49,33,0.12)]" aria-label={`${roles[activeRole].title} workspace illustration`}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#f4f7f1] px-5 py-3">
                <span className="font-display text-sm font-bold text-ink-900">Roomora</span>
                <span className="text-xs font-medium text-ink-500">{roles[activeRole].title} view</span>
              </div>
              <div className="grid min-h-[310px] sm:grid-cols-[145px_1fr]">
                <div className="hidden border-r border-slate-200 bg-[#f9fbf7] p-4 sm:block">
                  <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Workspace</p>
                  <div className="space-y-2">
                    {roles[activeRole].menu.map((item, index) => <div key={item} className={`rounded-md px-3 py-2 text-xs font-medium ${index === 0 ? 'bg-brand-100 text-brand-800' : 'text-ink-500'}`}>{item}</div>)}
                  </div>
                </div>
                <div className="p-5 sm:p-7">
                  <p className="text-xs font-medium text-ink-500">{roles[activeRole].screen}</p>
                  <h4 className="mt-1 font-display text-xl font-semibold text-ink-900">{roles[activeRole].subject}</h4>
                  <div className="role-preview-status mt-6 flex items-center justify-between gap-3 rounded-lg bg-[#edf5e9] px-4 py-4">
                    <span className="text-sm font-semibold text-brand-800">{roles[activeRole].highlight}</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand-700">{roles[activeRole].status}</span>
                  </div>
                  <div className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
                    {roles[activeRole].details.map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-3 text-sm"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-900">{value}</span></div>)}
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-700"><Icon name="check" size={15} /> All information in one place</div>
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
              <p className="mobile-secondary-copy mt-5 max-w-md text-base leading-relaxed text-white/75">
                Screening brings the important details together so an owner can review each applicant with confidence.
                Recommendations always stay advisory.
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
                  { icon: 'file' as IconName, step: '01', title: 'Application received', detail: 'Details and documents in one place', tone: 'text-white/70' },
                  { icon: 'sparkles' as IconName, step: '02', title: 'AI prepares insights', detail: 'Checks, reasons and a summary', tone: 'text-brand-300' },
                  { icon: 'key' as IconName, step: '03', title: 'Owner reviews and decides', detail: 'The final decision belongs to you', tone: 'text-white' },
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
