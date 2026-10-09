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

function FeaturePreview({ index }: { index: number }) {
  return (
    <div className="feature-visual mt-5 max-w-xl border-y border-[#b9c7b5] py-3 sm:mt-7 sm:py-4" aria-hidden="true">
      <svg viewBox="0 0 560 270" className="h-[180px] w-full sm:h-[250px]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#d2ddcc" strokeWidth="1"><path d="M0 0H560M0 269H560" /><path d="M0 0V270M559 0V270" /></g>
        {index === 0 && <>
          <path className="feature-draw" d="M105 134H215M345 134H455" stroke="#7ca66d" strokeWidth="2" />
          <path d="M199 128L215 134L199 140M439 128L455 134L439 140" stroke="#7ca66d" strokeWidth="2" />
          <g stroke="#3f7d36" strokeWidth="2"><path d="M43 75H115L134 94V188H43V75Z" /><path d="M115 75V94H134" /><path d="M61 113H112M61 128H101M61 143H109" /></g>
          <circle cx="280" cy="134" r="62" fill="#e8f2e1" stroke="#83b477" strokeWidth="2" />
          <circle className="feature-pulse" cx="280" cy="134" r="48" stroke="#83b477" strokeWidth="1.5" strokeDasharray="3 6" />
          <text x="280" y="131" textAnchor="middle" fill="#1d4c35" fontSize="16" fontWeight="700">REVIEW</text>
          <text x="280" y="153" textAnchor="middle" fill="#577564" fontSize="11">with reasons</text>
          <path d="M450 81H518V189H450V81Z" stroke="#3f7d36" strokeWidth="2" /><path d="M465 113L475 123L496 100M465 145H501M465 158H489" stroke="#3f7d36" strokeWidth="2" />
          <text x="43" y="219" fill="#60776a" fontSize="11">DOCUMENTS</text><text x="444" y="219" fill="#60776a" fontSize="11">OWNER DECIDES</text>
        </>}
        {index === 1 && <>
          <path d="M98 32H462V238H98V32Z" stroke="#2d6145" strokeWidth="3" />
          <path d="M98 117H337M337 32V238M98 179H337M337 146H462" stroke="#2d6145" strokeWidth="2" />
          <path d="M160 117V134M238 179V162M337 95H354M337 190H354" stroke="#f7f7f2" strokeWidth="5" />
          <path d="M120 53H313V98H120V53Z" fill="#dcebcf" /><path d="M358 53H441V127H358V53Z" fill="#e8f2e1" />
          <text x="138" y="81" fill="#276345" fontSize="14" fontWeight="700">ROOM 101</text><text x="358" y="101" fill="#276345" fontSize="13" fontWeight="700">ROOM 102</text>
          <text x="126" y="155" fill="#67806e" fontSize="11">OCCUPIED</text><text x="363" y="173" fill="#67806e" fontSize="11">OPEN</text>
          <circle className="feature-pulse" cx="412" cy="188" r="17" stroke="#4c8c40" strokeWidth="2" /><circle cx="412" cy="188" r="5" fill="#4c8c40" />
          <text x="103" y="259" fill="#60776a" fontSize="11">ONE PROPERTY · EVERY ROOM IN VIEW</text>
        </>}
        {index === 2 && <>
          <path d="M42 62H205V219H42V62Z" stroke="#346b47" strokeWidth="2" /><path d="M59 83H170M59 103H187M59 123H179M59 165C85 145 92 183 118 164C140 149 151 180 185 159" stroke="#346b47" strokeWidth="2" />
          <text x="59" y="207" fill="#5e7867" fontSize="11">LEASE</text>
          <path className="feature-draw" d="M210 139H351" stroke="#83b477" strokeWidth="2" /><path d="M339 133L352 139L339 145" stroke="#83b477" strokeWidth="2" />
          <circle cx="404" cy="139" r="60" stroke="#4c8c40" strokeWidth="2" fill="#e8f2e1" /><path d="M377 139L396 158L432 119" stroke="#3f7d36" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="348" y="228" fill="#60776a" fontSize="11">PAYMENTS TRACKED</text>
          <path d="M42 38H518" stroke="#b9c7b5" /><text x="42" y="28" fill="#60776a" fontSize="11">APPROVAL</text><text x="417" y="28" fill="#60776a" fontSize="11">TENANCY</text>
        </>}
        {index === 3 && <>
          <path d="M44 200H517" stroke="#b9c7b5" strokeWidth="2" />
          <path className="feature-draw" d="M83 200V118H255V200M255 200V70H429V200" stroke="#4c8c40" strokeWidth="3" />
          <circle cx="83" cy="118" r="10" fill="#f7f7f2" stroke="#4c8c40" strokeWidth="3" /><circle cx="255" cy="70" r="10" fill="#f7f7f2" stroke="#4c8c40" strokeWidth="3" /><circle className="feature-pulse" cx="429" cy="94" r="22" fill="#dcebcf" stroke="#4c8c40" strokeWidth="2" />
          <path d="M419 94L426 101L439 87" stroke="#2d6145" strokeWidth="3" strokeLinecap="round" />
          <text x="45" y="235" fill="#3f7d36" fontSize="12" fontWeight="700">REQUESTED</text><text x="215" y="235" fill="#3f7d36" fontSize="12" fontWeight="700">ASSIGNED</text><text x="389" y="235" fill="#3f7d36" fontSize="12" fontWeight="700">RESOLVED</text>
          <text x="44" y="37" fill="#60776a" fontSize="11">A CLEAR PATH FROM REPORT TO REPAIR</text>
        </>}
        {index === 4 && <>
          <circle cx="279" cy="135" r="103" stroke="#c7d8c0" strokeWidth="1.5" /><circle cx="279" cy="135" r="72" stroke="#c7d8c0" strokeWidth="1.5" /><circle cx="279" cy="135" r="40" fill="#e8f2e1" stroke="#4c8c40" strokeWidth="2" />
          <path className="feature-draw" d="M279 135L204 65M279 135L365 102M279 135L321 218" stroke="#78a86c" strokeWidth="1.5" />
          <circle className="feature-pulse" cx="204" cy="65" r="10" fill="#4c8c40" /><circle className="feature-pulse" cx="365" cy="102" r="10" fill="#4c8c40" /><circle className="feature-pulse" cx="321" cy="218" r="10" fill="#4c8c40" />
          <text x="279" y="139" textAnchor="middle" fill="#276345" fontSize="13" fontWeight="700">ALERTS</text>
          <text x="113" y="59" fill="#60776a" fontSize="12">RENT</text><text x="386" y="105" fill="#60776a" fontSize="12">LEASES</text><text x="339" y="235" fill="#60776a" fontSize="12">TASKS</text>
        </>}
        {index === 5 && <>
          <text x="31" y="45" fill="#60776a" fontSize="11">ASK</text><text x="439" y="45" fill="#60776a" fontSize="11">ANSWER</text>
          <path d="M31 66H193V138H31V66Z" stroke="#3f7d36" strokeWidth="2" /><text x="49" y="94" fill="#276345" fontSize="14" fontWeight="700">Which rooms</text><text x="49" y="115" fill="#276345" fontSize="14" fontWeight="700">need attention?</text>
          <path className="feature-draw" d="M193 102H254M254 102V48H352M254 102V137H352M254 102V222H352M352 48H395M352 137H395M352 222H395" stroke="#75a467" strokeWidth="2" />
          <circle cx="352" cy="48" r="6" fill="#4c8c40" /><circle cx="352" cy="137" r="6" fill="#4c8c40" /><circle cx="352" cy="222" r="6" fill="#4c8c40" />
          <text x="274" y="43" fill="#60776a" fontSize="11">ROOMS</text><text x="274" y="132" fill="#60776a" fontSize="11">RENT</text><text x="274" y="217" fill="#60776a" fontSize="11">TASKS</text>
          <path d="M395 73H529V199H395V73Z" fill="#e8f2e1" stroke="#4c8c40" strokeWidth="2" /><path d="M412 105H508M412 125H490M412 145H503M412 165H473" stroke="#4c8c40" strokeWidth="2" />
          <text x="31" y="251" fill="#60776a" fontSize="11">AN ANSWER GROUNDED IN YOUR PROPERTY RECORDS</text>
        </>}
      </svg>
    </div>
  );
}

export default function Landing() {
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
  const featureSectionRef = useRef<HTMLElement>(null);
  const aiSectionRef = useRef<HTMLElement>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
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
    <div ref={landingRef} className={`min-h-screen bg-[#f7f7f2] ${introActive ? 'roomora-intro-active' : ''}`}>
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
                    className={`group absolute left-1/2 top-1/2 flex h-[270px] w-[64vw] max-w-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.16)] sm:h-[430px] sm:p-8 ${deckTransition ? 'transition-[transform,opacity] duration-500 ease-in-out motion-reduce:transition-none' : ''}`}
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
              <p className="text-base font-semibold uppercase tracking-[0.2em] text-brand-700 sm:text-xl">Features</p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-5xl">
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
              <p className="text-lg leading-relaxed text-white/75 sm:text-xl">
                Bring your properties, people and everyday work into one calm place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-[#b6df9a] px-6 py-3 text-sm font-semibold text-[#123d31] transition-colors hover:bg-white focus-visible:ring-[#b6df9a]">
                  Create your account <span aria-hidden="true">↗</span>
                </Link>
                <Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg border border-white/45 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:ring-white">
                  Explore the demo <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-10">
          <div>
            <Link to="/" className="font-wordmark text-3xl font-bold tracking-tight text-white sm:text-4xl">Roomora</Link>
            <p className="mt-2 text-sm text-white/55">A better way to keep rentals moving.</p>
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
