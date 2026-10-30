import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import './FeatureJourney.css';

const chapters: { title: string; short: string; eyebrow: string; description: string; icon: IconName }[] = [
  {
    title: 'A better first impression.', short: 'Applications', eyebrow: '01 / THE ARRIVAL', icon: 'sparkles',
    description: 'Documents and verified KYC unified for faster, clearer reviews.',
  },
  {
    title: 'Every room has a story.', short: 'Rooms', eyebrow: '02 / THE PLACE', icon: 'building',
    description: 'Live occupancy, rent, and unit details across all properties.',
  },
  {
    title: 'The paperwork falls into place.', short: 'Rent & leases', eyebrow: '03 / THE AGREEMENT', icon: 'file',
    description: 'Instant lease signing and automated rent reconciliation.',
  },
  {
    title: 'Help is already on its way.', short: 'Repairs', eyebrow: '04 / THE EVERYDAY', icon: 'wrench',
    description: 'Photo issue reports and live technician dispatch tracking.',
  },
  {
    title: 'The little things don’t slip.', short: 'Warnings', eyebrow: '05 / THE HEADS-UP', icon: 'bell',
    description: 'Proactive alerts for upcoming rent and expiring leases.',
  },
  {
    title: 'Answers, when you need them.', short: 'Assistant', eyebrow: '06 / THE BIG PICTURE', icon: 'bot',
    description: 'Instant AI insights across your entire rental portfolio.',
  },
];

function Activity({ index }: { index: number }) {
  if (index === 0) return <>
    <div className="journey-activity-top"><span>NEW APPLICATION</span><Icon name="sparkles" size={19} /></div>
    <div className="journey-activity-person"><span className="journey-person-avatar">AK</span><span><strong>Avery Kapoor</strong><small>Room 204 · Maple House</small></span></div>
    <div className="journey-activity-line"><span>Documents received</span><span className="journey-check"><Icon name="check" size={13} /></span></div>
    <div className="journey-activity-line"><span>Ready for your review</span><span className="journey-check"><Icon name="check" size={13} /></span></div>
    <div className="journey-activity-foot">Final decision stays with you <span>↗</span></div>
  </>;
  if (index === 1) return <>
    <div className="journey-activity-top"><span>MAPLE HOUSE / LIVE</span><Icon name="building" size={19} /></div>
    <div className="journey-big-number">12 <small>rooms</small></div>
    <div className="journey-occupancy"><span style={{ width: '75%' }} /><span style={{ width: '25%' }} /></div>
    <div className="journey-activity-line"><span>Occupied</span><strong>09</strong></div>
    <div className="journey-activity-line"><span>Ready for applications</span><strong>03</strong></div>
    <div className="journey-activity-foot">A clear view, room by room <span>↗</span></div>
  </>;
  if (index === 2) return <>
    <div className="journey-activity-top"><span>PAYMENT RECEIVED</span><Icon name="wallet" size={19} /></div>
    <div className="journey-payment-mark"><Icon name="check" size={30} /></div>
    <div className="journey-big-number">₹15,000</div>
    <div className="journey-activity-line"><span>October rent · Room 204</span><strong>Paid</strong></div>
    <div className="journey-activity-foot">Lease and payments, together <span>↗</span></div>
  </>;
  if (index === 3) return <>
    <div className="journey-activity-top"><span>WORK ORDER / 018</span><Icon name="wrench" size={19} /></div>
    <div className="journey-activity-heading">AC repair</div>
    <div className="journey-activity-sub">Room 204 · Maple House</div>
    <div className="journey-task-track"><span className="is-done" /><span className="is-done" /><span className="is-current" /></div>
    <div className="journey-task-labels"><span>Reported</span><span>Assigned</span><span>In progress</span></div>
    <div className="journey-activity-person"><span className="journey-person-avatar">RK</span><span><strong>Raj Kumar</strong><small>On the task now</small></span></div>
  </>;
  if (index === 4) return <>
    <div className="journey-activity-top"><span>YOUR DAILY BRIEFING</span><Icon name="bell" size={19} /></div>
    <div className="journey-activity-heading">Two things to notice.</div>
    <div className="journey-alert"><span className="journey-alert-mark">!</span><span><strong>Rent due soon</strong><small>Room 103 · in 3 days</small></span></div>
    <div className="journey-alert"><span className="journey-alert-mark">↗</span><span><strong>Lease ending</strong><small>Room 205 · renewal window</small></span></div>
    <div className="journey-activity-foot">A little notice goes a long way <span>↗</span></div>
  </>;
  return <>
    <div className="journey-activity-top"><span>ASK ROOMORA</span><Icon name="sparkles" size={19} /></div>
    <div className="journey-question">Which rooms need attention this week?</div>
    <div className="journey-answer"><span className="journey-answer-spark">✳</span><span><strong>Here’s what I found</strong><small>Room 103 has rent due soon. Room 205 is nearing lease renewal. The repair in Room 204 is in progress.</small></span></div>
    <div className="journey-activity-foot">A clearer view of your day <span>↗</span></div>
  </>;
}

export default function FeatureJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pinned, setPinned] = useState(() => window.matchMedia('(min-width: 1024px) and (min-height: 800px)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const screen = window.matchMedia('(min-width: 1024px) and (min-height: 800px)');
    const update = () => setPinned(screen.matches);
    screen.addEventListener('change', update);
    return () => screen.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    let frame = 0;
    const update = () => {
      const section = sectionRef.current;
      if (!section) return;
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / range));
      setActive(Math.min(chapters.length - 1, Math.floor(progress * chapters.length)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; update(); });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pinned]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused || reducedMotion || pinned) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % chapters.length), 6500);
    return () => window.clearTimeout(timer);
  }, [active, visible, paused, reducedMotion, pinned]);

  const chooseChapter = (index: number) => {
    setActive(index);
    if (!pinned || !sectionRef.current) return;
    const section = sectionRef.current;
    const range = Math.max(0, section.offsetHeight - window.innerHeight);
    const top = window.scrollY + section.getBoundingClientRect().top;
    window.scrollTo({ top: top + range * ((index + 0.5) / chapters.length), behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  return (
    <section id="features" ref={sectionRef} className={`feature-journey scene-${active}${paused ? ' is-paused' : ''}${pinned ? ' is-pinned' : ''}`} aria-label="Explore Roomora features" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="journey-wrap">
        <div className="journey-intro"><span className="journey-kicker"><span className="journey-kicker-dot" /> ROOMORA IN MOTION</span><h2>A building is never <em>still.</em></h2><p>From the first application to the everyday moments that make a place feel like home.</p></div>
        <div className="journey-stage">
          <div className="journey-stage-copy" key={`copy-${active}`}><span className="journey-chapter">{chapters[active].eyebrow}</span><h3>{chapters[active].title}</h3><p>{chapters[active].description}</p><div className="journey-copy-footer"><span className="journey-copy-icon"><Icon name={chapters[active].icon} size={21} /></span><span>See the moments that matter</span></div></div>
          <div className="journey-visual" aria-hidden="true">
            <div className="journey-halo journey-halo-one" /><div className="journey-halo journey-halo-two" />
            <svg className="journey-flow" viewBox="0 0 600 500" fill="none" preserveAspectRatio="none"><path d="M82 363 C130 330 154 296 212 305 S304 195 350 210 S430 125 526 139" /><circle cx="82" cy="363" r="5" /><circle cx="526" cy="139" r="5" /></svg>
            <div className="journey-building"><div className="journey-roof"><span>MAPLE HOUSE</span><span>EST. 2024</span></div><div className="journey-windows">{['101','102','103','201','202','203'].map((room, index) => <div key={room} className={`journey-window ${index === active ? 'is-lit' : ''}`}><span className="journey-window-number">{room}</span><span className="journey-window-art"><i /><i /></span><span className="journey-window-glow" /></div>)}</div><div className="journey-building-ground"><span>12 ROOMS</span><span>ONE CONNECTED PLACE</span></div></div>
            <div className="journey-beacon journey-beacon-one"><span /></div><div className="journey-beacon journey-beacon-two"><span /></div>
            <div className="journey-activity" key={`activity-${active}`}><Activity index={active} /></div>
            <div className="journey-live-note" key={`note-${active}`}><span className="journey-live-pulse" /><span>{['Application received','Room status updated','Payment recorded','Staff assigned','Reminder surfaced','Answer ready'][active]}</span></div>
          </div>
          <div className="journey-stage-bottom"><span>A DAY IN THE LIFE OF A PROPERTY</span><span>{String(active + 1).padStart(2, '0')} — 06</span></div>
        </div>
        <div className="journey-controls-heading"><span>CHOOSE A MOMENT</span><span>{pinned ? 'Scroll to explore ↓' : 'Explore the story ↗'}</span></div>
        <div className="journey-controls" role="group" aria-label="Choose a feature">
          {chapters.map((chapter, index) => (
            <button key={chapter.short} type="button" className={`journey-control ${active === index ? 'is-active' : ''}`} onClick={() => chooseChapter(index)} aria-pressed={active === index}>
              <span className="journey-control-top"><small>{String(index + 1).padStart(2, '0')}</small><Icon name={chapter.icon} size={19} /></span>
              <strong>{chapter.short}</strong>
              <span className="journey-control-line"><i key={`${active}-${index}`} /></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
