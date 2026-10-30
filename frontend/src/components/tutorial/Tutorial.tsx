import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModalOverlay from '../ModalOverlay';
import { Icon } from '../Icon';
import { TOURS, type TutorialRole, type TourStep } from './tours';
import './Tutorial.css';

type Progress = { offered: boolean; tourId?: string; step?: number; completed?: string[] };
function readProgress(key: string): Progress {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return { offered: false };
    return { offered: value.offered === true, tourId: typeof value.tourId === 'string' ? value.tourId : undefined, step: Number.isInteger(value.step) && value.step >= 0 ? value.step : 0, completed: Array.isArray(value.completed) ? value.completed.filter((id: unknown): id is string => typeof id === 'string') : [] };
  } catch { return { offered: false }; }
}

type Bounds = { top: number; left: number; width: number; height: number };
function visibleTarget(step: TourStep) {
  const candidates = step.target ? Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`)) : [];
  return candidates.find((el) => el.getClientRects().length > 0) ?? document.querySelector<HTMLElement>('[data-tour-page] h1') ?? document.querySelector<HTMLElement>('[data-tour-page]');
}

function GuidedStep({ step, index, total, title, onBack, onNext, onClose, onOptions, leaving }: {
  step: TourStep; index: number; total: number; title: string; onBack: () => void; onNext: () => void; onClose: () => void; onOptions: () => void;
  leaving: boolean;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [anchorBounds, setAnchorBounds] = useState<Bounds | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const [panelHeight, setPanelHeight] = useState(340);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const panel = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-tutorial-active', '');
    return () => document.documentElement.removeAttribute('data-tutorial-active');
  }, []);

  useEffect(() => {
    if (pathname !== step.path) navigate(step.path, { replace: true });
  }, [navigate, pathname, step.path]);

  useLayoutEffect(() => {
    setScrolling(false);
    if (pathname !== step.path) return;
    let frame = 0;
    let scrollTimer = 0;
    let isScrolling = false;
    let lastTarget: HTMLElement | null = null;
    let revealed = false;
    const measure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // These two selectors only open an existing property's room list.
        // Never invoke form, payment, approval, or other mutation controls.
        if (!revealed && step.reveal && !document.querySelector(`[data-tour="${step.target}"]`)) {
          const reveal = document.querySelector<HTMLButtonElement>(`[data-tour="${step.reveal}"]`);
          if (reveal) { revealed = true; reveal.click(); }
        }
        const target = visibleTarget(step);
        if (target && target !== lastTarget) {
          lastTarget = target;
          const rect = target.getBoundingClientRect();
          // Leave already visible controls in place rather than nudging every page.
          if (rect.top < 88 || rect.bottom > window.innerHeight - 24) {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) onScroll();
            target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          }
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        setViewport((previous) => previous.width === width && previous.height === height ? previous : { width, height });
        const rect = target?.getBoundingClientRect();
        if (!rect) return;
        const left = Math.max(8, rect.left - 6);
        const top = Math.max(8, rect.top - 6);
        const next = { left, top, width: Math.max(0, Math.min(width - 8, rect.right + 6) - left), height: Math.max(0, Math.min(height - 8, rect.bottom + 6) - top) };
        const update = (previous: Bounds | null) => previous && Object.entries(next).every(([key, value]) => Math.abs(previous[key as keyof Bounds] - value) < 0.5) ? previous : next;
        setBounds(update);
        // Keep the card still while the page scrolls, then ease to its final anchor.
        if (!isScrolling) setAnchorBounds(update);
      });
    };
    const onScroll = () => {
      isScrolling = true;
      setScrolling(true);
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => { isScrolling = false; setScrolling(false); measure(); }, 120);
      measure();
    };
    const observer = new MutationObserver(measure);
    const page = document.querySelector('[data-tour-page]');
    if (page) observer.observe(page, { childList: true, subtree: true });
    // Re-measure when loading resolves, route animations settle, or layout shifts.
    const resizeObserver = new ResizeObserver(measure);
    if (page) resizeObserver.observe(page);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, true);
    return () => { observer.disconnect(); resizeObserver.disconnect(); cancelAnimationFrame(frame); clearTimeout(scrollTimer); window.removeEventListener('resize', measure); window.removeEventListener('scroll', onScroll, true); };
  }, [step, pathname]);

  useLayoutEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(() => setPanelHeight(panel.current?.getBoundingClientRect().height ?? 340));
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);

  const width = Math.min(400, viewport.width - 32);
  const left = anchorBounds ? Math.max(16, Math.min(anchorBounds.left, viewport.width - width - 16)) : (viewport.width - width) / 2;
  const below = anchorBounds ? anchorBounds.top + anchorBounds.height + 16 : 0;
  const top = anchorBounds && below + panelHeight <= viewport.height - 16 ? below
    : anchorBounds && anchorBounds.top - panelHeight - 16 >= 16 ? anchorBounds.top - panelHeight - 16
    : Math.max(16, viewport.height - panelHeight - 16);

  return <ModalOverlay onClose={onClose} labelledBy="tutorial-step-title" className={`tutorial-layer${leaving ? ' tutorial-leaving' : ''}`}>
    {bounds ? <div aria-hidden="true" className={`tutorial-spotlight${scrolling ? ' tutorial-spotlight-scrolling' : ''}`} style={{ width: bounds.width, height: bounds.height, transform: `translate3d(${bounds.left}px, ${bounds.top}px, 0)` }} /> : <div aria-hidden="true" className="tutorial-scrim" />}
    <section ref={panel} className="tutorial-step" style={{ width, transform: `translate3d(${left}px, ${top}px, 0)`, maxHeight: viewport.height - 32 }}>
      <div className="tutorial-step-top"><span>{title}</span><button type="button" className="tutorial-icon-button" onClick={onClose} aria-label="Close tutorial and save progress"><Icon name="x" size={18} /></button></div>
      <div className="tutorial-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
      <div aria-live="polite" aria-atomic="true">
        <div key={`${step.path}:${index}`} className="tutorial-step-content">
        <p className="tutorial-eyebrow">Step {index + 1} of {total}</p>
        <h2 id="tutorial-step-title">{step.title}</h2>
        <p className="tutorial-body">{step.body}</p>
        {step.tip && <p className="tutorial-tip"><Icon name="info" size={16} /><span>{step.tip}</span></p>}
        </div>
      </div>
      <div className="tutorial-controls"><button type="button" className="btn-secondary btn-sm" onClick={onBack} disabled={index === 0}><Icon name="chevronLeft" size={15} /> Back</button><button type="button" className="btn-primary btn-sm" onClick={onNext}>{index === total - 1 ? 'Finish tutorial' : 'Next'}<Icon name={index === total - 1 ? 'check' : 'chevronRight'} size={15} /></button></div>
      <div className="tutorial-step-footer"><button type="button" onClick={onOptions}>All tutorials</button><button type="button" onClick={onClose}>Skip for now</button></div>
    </section>
  </ModalOverlay>;
}

export default function Tutorial({ userId, role }: { userId: string; role: TutorialRole }) {
  const storageKey = `roomora:tutorial:v1:${userId}:${role}`;
  const [progress, setProgress] = useState(() => readProgress(storageKey));
  const [mode, setMode] = useState<'closed' | 'options' | 'tour' | 'complete'>(() => readProgress(storageKey).offered ? 'closed' : 'options');
  const [leaving, setLeaving] = useState(false);
  const modeTimer = useRef<number>();
  useEffect(() => () => clearTimeout(modeTimer.current), []);
  const switchMode = (next: typeof mode) => {
    if (modeTimer.current !== undefined) return;
    if (mode === 'closed' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setMode(next); return; }
    setLeaving(true);
    modeTimer.current = window.setTimeout(() => { setMode(next); setLeaving(false); modeTimer.current = undefined; }, 160);
  };
  const [tourId, setTourId] = useState('full');
  const [index, setIndex] = useState(0);
  const tours = TOURS[role];
  const tour = tours.find((item) => item.id === tourId) ?? tours[0];
  const resumeTour = tours.find((item) => item.id === progress.tourId);
  const canResume = resumeTour && typeof progress.step === 'number' && progress.step < resumeTour.steps.length;
  const updateProgress = useCallback((update: Partial<Progress>) => {
    setProgress((previous) => ({ ...previous, ...update }));
  }, []);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Tutorials still work when browser storage is unavailable. */ }
  }, [storageKey, progress]);

  const close = () => { updateProgress({ offered: true }); switchMode('closed'); };
  const start = (id: string, step = 0) => {
    const selected = tours.find((item) => item.id === id) ?? tours[0];
    const safeStep = Math.max(0, Math.min(step, selected.steps.length - 1));
    setTourId(selected.id); setIndex(safeStep);
    updateProgress({ offered: true, tourId: selected.id, step: safeStep });
    switchMode('tour');
  };
  const move = (next: number) => {
    if (leaving) return;
    if (next >= tour.steps.length) {
      updateProgress({ tourId: undefined, step: undefined, completed: [...new Set([...(progress.completed ?? []), tour.id])] });
      switchMode('complete');
    } else { setIndex(next); updateProgress({ step: next }); }
  };

  return <>
    <button type="button" aria-label="See tutorial" title="See tutorial" className="btn-secondary btn-sm tutorial-launch" onClick={() => switchMode('options')}><Icon name="file" size={15} /><span>See tutorial</span></button>
    {mode === 'options' && <ModalOverlay onClose={close} labelledBy="tutorial-options-title" className={`tutorial-modal${leaving ? ' tutorial-leaving' : ''}`}>
      <section className="tutorial-options">
        <div className="tutorial-options-heading"><span className="tutorial-mark"><Icon name={role === 'OWNER' ? 'building' : 'home'} size={26} /></span><button type="button" className="tutorial-icon-button" onClick={close} aria-label="Close tutorials"><Icon name="x" size={20} /></button></div>
        <p className="tutorial-eyebrow">{role === 'OWNER' ? 'Property owner' : 'Tenant'} guide</p>
        <h2 id="tutorial-options-title">{progress.offered ? 'A little guidance, anytime.' : 'Make yourself at home.'}</h2>
        <p className="tutorial-body">{progress.offered ? 'Take the full tour or jump into a workflow.' : 'Your account is ready. Take a guided look around your workspace, or explore at your own pace.'} We’ll highlight the controls as you go.</p>
        {canResume && <button type="button" className="tutorial-resume" onClick={() => start(resumeTour.id, progress.step)}><Icon name="clock" size={18} /><span>Resume {resumeTour.title.toLowerCase()}<small>Continue at step {(progress.step ?? 0) + 1} of {resumeTour.steps.length}</small></span><Icon name="chevronRight" size={18} /></button>}
        <div className="tutorial-choices">{tours.map((item, position) => <button type="button" key={item.id} className={`tutorial-choice ${position === 0 ? 'tutorial-choice-featured' : ''}`} onClick={() => start(item.id)}>
          <span className="tutorial-choice-number">{position === 0 ? <Icon name="sparkles" size={19} /> : String(position).padStart(2, '0')}</span>
          <span><strong>{item.title}</strong><span className="tutorial-choice-description">{item.description}</span><small>{item.steps.length} steps{progress.completed?.includes(item.id) ? ' · Completed · Replay' : ''}</small></span><Icon name="chevronRight" size={18} />
        </button>)}</div>
        <div className="tutorial-options-footer"><button type="button" className="btn-secondary btn-sm" onClick={close}>Maybe later</button></div>
      </section>
    </ModalOverlay>}
    {mode === 'tour' && <GuidedStep leaving={leaving} step={tour.steps[index]} index={index} total={tour.steps.length} title={tour.title} onBack={() => move(Math.max(0, index - 1))} onNext={() => move(index + 1)} onClose={close} onOptions={() => switchMode('options')} />}
    {mode === 'complete' && <ModalOverlay onClose={close} labelledBy="tutorial-complete-title" className={`tutorial-modal${leaving ? ' tutorial-leaving' : ''}`}><section className="tutorial-options tutorial-complete"><span className="tutorial-mark"><Icon name="check" size={28} /></span><p className="tutorial-eyebrow">Tutorial complete</p><h2 id="tutorial-complete-title">You’re ready to explore.</h2><p className="tutorial-body">You’ve finished {tour.title.toLowerCase()}. Try the workflow when you’re ready, or return to “See tutorial” for a refresher.</p><div className="tutorial-controls"><button type="button" className="btn-secondary" onClick={() => switchMode('options')}>More tutorials</button><button type="button" className="btn-primary" onClick={close}>Got it</button></div></section></ModalOverlay>}
  </>;
}
