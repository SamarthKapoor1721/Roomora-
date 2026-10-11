import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './FeatureShowcase.css';

const labels = ['Application review', 'Property overview', 'Lease & payments', 'Maintenance', 'Smart alerts', 'Roomora assistant'];

function Badge({ icon, children, tone = 'green' }: { icon: IconName; children: ReactNode; tone?: 'green' | 'blue' | 'amber' }) {
  return <span className={`feature-badge feature-badge--${tone}`}><Icon name={icon} size={12} />{children}</span>;
}

function ScreenContent({ index }: { index: number }) {
  if (index === 0) return (
    <div className="feature-scene feature-scene--screening">
      <div className="feature-illustration-sheet feature-screening-person">
        <div className="feature-sheet-top"><span>APPLICATION / 024</span><Icon name="file" size={17} /></div>
        <div className="feature-avatar"><span>AK</span></div>
        <strong>Avery Kapoor</strong><small>Room 204 · Maple House</small>
        <div className="feature-sheet-rule" />
        <div className="feature-document"><Icon name="file" size={15} /><span>Identity document</span><Icon name="check" size={13} /></div>
        <div className="feature-document"><Icon name="file" size={15} /><span>Income proof</span><Icon name="check" size={13} /></div>
      </div>
      <div className="feature-screening-review">
        <div className="feature-review-orbit"><div className="feature-review-core"><Icon name="sparkles" size={23} /><strong>Review ready</strong><span>Clear reasons, human decision</span></div></div>
        <div className="feature-review-footer"><span><i /> Documents checked</span><span><i /> Criteria matched</span></div>
      </div>
      <div className="feature-float feature-float--screening"><Icon name="check" size={16} /><span><strong>Owner in control</strong><small>Final decision stays yours</small></span></div>
    </div>
  );

  if (index === 1) return (
    <div className="feature-scene feature-scene--property">
      <div className="feature-property-photo"><img src="/images/step-listing.jpg" alt="" /><div className="feature-photo-overlay"><span>Maple House</span><small>12 rooms · 3 available</small></div></div>
      <div className="feature-property-content">
        <div className="feature-section-label">YOUR PORTFOLIO <Badge icon="building">Live overview</Badge></div>
        <strong>Every room, in view.</strong>
        <div className="feature-room-row"><span className="feature-room-icon"><Icon name="door" size={16} /></span><span><b>Room 101</b><small>Occupied · Rent on track</small></span><i className="feature-status-dot" /></div>
        <div className="feature-room-row"><span className="feature-room-icon"><Icon name="door" size={16} /></span><span><b>Room 102</b><small>Ready for applications</small></span><i className="feature-status-dot feature-status-dot--light" /></div>
        <div className="feature-room-row"><span className="feature-room-icon"><Icon name="door" size={16} /></span><span><b>Room 103</b><small>Viewing scheduled</small></span><i className="feature-status-dot feature-status-dot--blue" /></div>
      </div>
    </div>
  );

  if (index === 2) return (
    <div className="feature-scene feature-scene--lease">
      <div className="feature-lease-paper"><div className="feature-section-label">ROOMORA / AGREEMENT</div><Icon name="file" size={25} /><strong>Lease agreement</strong><small>Maple House · Room 204</small><div className="feature-paper-lines"><i /><i /><i /><i /></div><div className="feature-signatures"><span>Owner signature</span><span>Tenant signature</span></div></div>
      <div className="feature-payment-panel"><div className="feature-section-label">PAYMENT STATUS</div><div className="feature-payment-check"><Icon name="check" size={27} /></div><strong>All caught up</strong><small>October rent received</small><div className="feature-payment-amount"><span>Monthly rent</span><b>₹15,000</b></div><Badge icon="calendar">Next due · 01 Nov</Badge></div>
    </div>
  );

  if (index === 3) return (
    <div className="feature-scene feature-scene--maintenance">
      <div className="feature-maintenance-photo"><img src="/images/feature-maintenance.jpg" alt="" /><span><Icon name="camera" size={14} /> Before photo</span></div>
      <div className="feature-maintenance-ticket"><div className="feature-section-label">WORK ORDER / 018</div><div className="feature-ticket-heading"><Icon name="wrench" size={22} /><strong>AC repair</strong></div><small>Room 204 · Maple House</small><div className="feature-ticket-steps"><span className="done"><i />Reported</span><span className="done"><i />Assigned</span><span><i />In progress</span></div><div className="feature-assignee"><span className="feature-assignee-avatar">RK</span><span><b>Raj Kumar</b><small>Maintenance staff</small></span><Badge icon="clock" tone="blue">On task</Badge></div></div>
    </div>
  );

  if (index === 4) return (
    <div className="feature-scene feature-scene--alerts">
      <div className="feature-alerts-main"><div className="feature-section-label">YOUR DAILY BRIEFING <Icon name="bell" size={16} /></div><strong>Good morning, Sam.</strong><small>Three things need your attention today.</small><div className="feature-alert-row"><span className="feature-alert-icon feature-alert-icon--amber"><Icon name="wallet" size={18} /></span><span><b>Rent due soon</b><small>Room 103 · due in 3 days</small></span><Icon name="chevronRight" size={16} /></div><div className="feature-alert-row"><span className="feature-alert-icon feature-alert-icon--blue"><Icon name="calendar" size={18} /></span><span><b>Lease ending</b><small>Room 205 · renewal window open</small></span><Icon name="chevronRight" size={16} /></div><div className="feature-alert-row"><span className="feature-alert-icon"><Icon name="wrench" size={18} /></span><span><b>Repair update</b><small>AC repair · staff assigned</small></span><Icon name="chevronRight" size={16} /></div></div>
    </div>
  );

  return (
    <div className="feature-scene feature-scene--assistant"><div className="feature-chat-header"><span className="feature-bot-icon"><Icon name="bot" size={21} /></span><span><strong>Ask Roomora</strong><small>Answers from your workspace</small></span><Badge icon="sparkles">Ready</Badge></div><div className="feature-chat-question">Which rooms need attention this week?</div><div className="feature-chat-answer"><div className="feature-answer-title"><Icon name="sparkles" size={17} /><strong>Here’s what I found</strong></div><div className="feature-answer-row"><span>01</span><p><b>Room 103</b><small>Rent is due in 3 days</small></p><Icon name="arrowUpRight" size={15} /></div><div className="feature-answer-row"><span>02</span><p><b>Room 205</b><small>Lease renewal is coming up</small></p><Icon name="arrowUpRight" size={15} /></div><div className="feature-answer-row"><span>03</span><p><b>Room 204</b><small>AC repair is in progress</small></p><Icon name="arrowUpRight" size={15} /></div></div><div className="feature-chat-input">Ask a question about your properties <Icon name="send" size={15} /></div></div>
  );
}

export default function FeatureShowcase({ index }: { index: number }) {
  return <div className="feature-showcase" aria-hidden="true"><div className="feature-window"><div className="feature-window-bar"><span className="feature-window-dots"><i /><i /><i /></span><span>roomora&nbsp; / &nbsp;{labels[index]}</span><Icon name="menu" size={15} /></div><ScreenContent index={index} /></div><div className="feature-showcase-foot"><span>ROOMORA WORKSPACE</span><span>0{index + 1} / 06</span></div></div>;
}
