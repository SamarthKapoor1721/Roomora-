import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';

const features: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'sparkles',
    title: 'AI-assisted screening',
    desc: 'Intelligent eligibility assessment and document verification. You always make the final decision.',
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
    desc: 'Natural-language queries across your properties: occupancy, arrears, maintenance trends.',
  },
];

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

const workflowSteps: { title: string; description: string; icon: IconName }[] = [
  {
    title: 'Owner opens applications',
    description: 'Choose a room and invite tenants to apply.',
    icon: 'home',
  },
  {
    title: 'Tenant applies and uploads documents',
    description: 'Applicants share their details and required documents in one place.',
    icon: 'file',
  },
  {
    title: 'AI screening advises',
    description: 'Eligibility and document checks help the owner review each application.',
    icon: 'sparkles',
  },
  {
    title: 'Owner approves and creates a lease',
    description: 'The owner makes the final decision and assigns the tenant to a room.',
    icon: 'key',
  },
];

const featurePreviews = [
  { screen: 'Application review', subject: 'Tina Tenant', metric: '82%', metricLabel: 'Criteria match', rows: [['ID proof', 'Verified'], ['Income documents', 'Ready for review']], status: 'Owner decision pending' },
  { screen: 'Property overview', subject: 'Maple Residency', metric: '02', metricLabel: 'Rooms available', rows: [['Room 101', 'Occupied'], ['Room 102', 'Applications open']], status: 'Manage rooms' },
  { screen: 'Rent and payments', subject: 'July rent', metric: '₹18,000', metricLabel: 'Invoice total', rows: [['Rent', '₹15,000'], ['Food', '₹3,000']], status: 'Payment recorded' },
  { screen: 'Maintenance', subject: 'AC not cooling', metric: 'Open', metricLabel: 'Request status', rows: [['Priority', 'Medium'], ['Assigned team', 'Maintenance']], status: 'Track progress' },
  { screen: 'Warnings', subject: 'Rent reminder', metric: '03', metricLabel: 'Days until due', rows: [['Room', '101'], ['Next step', 'Notify tenant']], status: 'Automatic reminder' },
  { screen: 'Roomora assistant', subject: 'Portfolio question', metric: '02', metricLabel: 'Rooms to review', rows: [['Available rooms', 'Room 102'], ['Open requests', '1 maintenance']], status: 'Ask another question' },
];

function FeaturePreview({ index }: { index: number }) {
  const preview = featurePreviews[index];

  return (
    <div className="relative mt-6 max-w-xl" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-400" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
          </div>
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-ink-400">Roomora / {preview.screen}</span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ink-400">{preview.screen}</p>
              <p className="mt-0.5 font-display text-lg font-semibold text-ink-900">{preview.subject}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.65rem] font-semibold text-brand-700">{preview.status}</span>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#f4f9f0] px-4 py-3">
            <span className="font-display text-2xl font-bold text-brand-700 sm:text-3xl">{preview.metric}</span>
            <span className="text-xs font-medium text-ink-500">{preview.metricLabel}</span>
          </div>
          <div className="mt-3 hidden grid-cols-2 gap-3 sm:grid">
            {preview.rows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[0.65rem] text-ink-400">{label}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-ink-700">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 shadow-sm">
        <Icon name={features[index].icon} size={21} strokeWidth={1.6} />
      </span>
    </div>
  );
}

export default function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const featureSectionRef = useRef<HTMLElement>(null);
  const aiSectionRef = useRef<HTMLElement>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeRole, setActiveRole] = useState(0);
  // The extra copies let the deck wrap without jumping back across the screen.
  const [deckSlot, setDeckSlot] = useState(workflowSteps.length);
  const [deckTransition, setDeckTransition] = useState(true);
  const activeStep = deckSlot % workflowSteps.length;

  const moveStep = (direction: number) => {
    setDeckSlot((current) => current + direction);
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => moveStep(1), 2000);
    return () => window.clearTimeout(timer);
  }, [activeStep]);

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
    let frame = 0;
    const updateFeature = () => {
      const section = featureSectionRef.current;
      if (!section) return;
      const scrollRange = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollRange));
      setActiveFeature(Math.min(features.length - 1, Math.floor(progress * features.length)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateFeature();
      });
    };
    updateFeature();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
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

  const scrollToFeature = (index: number) => {
    const section = featureSectionRef.current;
    if (!section) return;
    const scrollRange = Math.max(0, section.offsetHeight - window.innerHeight);
    const top = window.scrollY + section.getBoundingClientRect().top;
    window.scrollTo({
      top: top + scrollRange * ((index + 0.5) / features.length),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#142c23]">
        <header className="absolute inset-x-0 top-0 z-30">
          <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6" aria-label="Main navigation">
            <span className="font-wordmark text-3xl font-bold tracking-tight text-white">Roomora</span>
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-md text-white hover:bg-white/15">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
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
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">How it works</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              From listing to lease, one step at a time
            </h2>
          </div>

          <div
            className="relative pb-4"
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
            <div className="relative mx-auto h-[300px] max-w-[960px] overflow-hidden sm:h-[490px]">
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
                    className={`absolute left-1/2 top-1/2 flex h-[270px] w-[64vw] max-w-[430px] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.16)] sm:h-[430px] sm:p-8 ${deckTransition ? 'transition-[transform,opacity] duration-500 ease-in-out motion-reduce:transition-none' : ''}`}
                    style={{
                      zIndex: 10 - Math.abs(position),
                      opacity: Math.abs(position) > 1 ? 0 : 1,
                      pointerEvents: Math.abs(position) > 1 ? 'none' : 'auto',
                      transform: `translate(-50%, -50%) translateX(${position * 63}%) rotate(${position * 8}deg) scale(${active ? 1 : 0.94})`,
                    }}
                  >
                    <span className={`font-display text-3xl font-semibold leading-none text-brand-700 sm:text-5xl ${active ? 'self-start' : 'self-center'}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="my-auto flex w-full justify-center text-brand-600" aria-hidden="true">
                      <Icon name={step.icon} size={72} strokeWidth={1.35} />
                    </span>
                    <span className="block w-full">
                      <span className="block font-display text-base font-semibold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">{step.title}</span>
                      <span className="mt-3 hidden text-lg leading-relaxed text-ink-600 sm:block">{step.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mx-auto mb-5 max-w-lg text-center text-sm text-ink-600 sm:hidden" aria-live="polite">
              {workflowSteps[activeStep].description}
            </p>

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

      {/* ── Scroll-driven features ─────────────────────────────── */}
      <section
        ref={featureSectionRef}
        className="relative border-b border-slate-200 bg-[#f7f7f2]"
        style={{ height: `${features.length * 55 + 70}svh` }}
      >
        <svg
          className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full text-white sm:h-20"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 0 H1440 Q720 120 0 0 Z" />
        </svg>
        <div className="sticky top-0 flex h-[100svh] items-center px-4 sm:px-6 lg:top-[15svh] lg:h-[70svh]">
          <div className="mx-auto grid w-full max-w-6xl gap-8 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Features</p>
              <h2 className="mt-3 max-w-md font-display text-2xl font-semibold leading-tight text-ink-900 sm:text-4xl">
                Everything you need to manage rentals
              </h2>
              <p className="mt-4 hidden max-w-md text-base text-ink-500 sm:block">
                Follow each part of your rental workflow in one place.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-2 border-l border-slate-200 lg:mt-10 lg:block lg:space-y-1">
                {features.map((feature, index) => (
                  <li key={feature.title}>
                    <button
                      type="button"
                      onClick={() => scrollToFeature(index)}
                      aria-current={activeFeature === index ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-xs transition-colors sm:text-sm lg:px-4 lg:py-2.5 ${activeFeature === index ? '-ml-px border-brand-600 font-semibold text-brand-700' : '-ml-px border-transparent text-ink-500 hover:text-ink-900'}`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${activeFeature === index ? 'bg-brand-600' : 'bg-slate-300'}`} />
                      {feature.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-h-[280px] [perspective:900px] sm:min-h-[480px]" aria-live="polite">
              <article key={activeFeature} className="feature-stage-in flex h-full flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {String(activeFeature + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
                  {features[activeFeature].title}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">{features[activeFeature].desc}</p>
                <FeaturePreview index={activeFeature} />
              </article>
              <div className="mt-4 h-0.5 w-full bg-slate-200" aria-hidden="true">
                <div className="h-full bg-brand-600 transition-[width] duration-500" style={{ width: `${((activeFeature + 1) / features.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────────────────────── */}
      <section className="border-t-[10px] border-[#a8db8b] bg-[#123d31] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">Made for every role</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">A workspace that fits your day.</h2>
            <p className="mt-4 text-white/70">Take a look inside Roomora from each point of view.</p>
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
            <div>
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
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-lg bg-[#edf5e9] px-4 py-4">
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
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
                Screening brings the important details together so an owner can review each applicant with confidence.
                Recommendations always stay advisory.
              </p>
              <ul className="mt-8 grid gap-3 text-sm text-white/85 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  'Eligibility with clear reasons',
                  'Document consistency checks',
                  'A readable application summary',
                  'Source shown for every AI result',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-300/20 text-brand-300">
                      <Icon name="check" size={13} strokeWidth={2.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
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
                      <span className="block text-xs text-white/60 sm:text-sm">{item.detail}</span>
                    </span>
                    <span className="self-start text-xs font-medium tabular-nums text-white/35">{item.step}</span>
                    {index === 1 && <span className={aiVisible ? 'ai-flow-scan' : 'hidden'} aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-white/55">The AI advises. The owner decides.</p>
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
          <span className="font-wordmark text-2xl font-bold tracking-tight text-ink-900">Roomora</span>
          <p className="text-xs text-ink-400">
            Smart rental management with AI-assisted screening · Demo environment
          </p>
        </div>
      </footer>
    </div>
  );
}
