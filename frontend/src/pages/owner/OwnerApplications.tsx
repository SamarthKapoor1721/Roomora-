import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorBanner, FilterSelect, Skeleton, date } from '../../components/ui';
import './OwnerApplications.css';

interface AppRow {
  id: string;
  status: string;
  createdAt: string;
  tenant: { fullName: string; email: string };
  room: { name: string; property: { name: string } };
  eligibility?: { score: number; scoreLabel: string; recommendation: string } | null;
  docVerification?: { overallStatus: string; consistencyScore: number } | null;
  _count: { documents: number };
}

const STATUS_OPTIONS = ['OWNER_REVIEW', 'UNDER_AI_REVIEW', 'DOCS_PENDING', 'APPROVED', 'REJECTED'];

const STATUS_LABELS: Record<string, string> = {
  OWNER_REVIEW: 'Owner review',
  UNDER_AI_REVIEW: 'Screening',
  DOCS_PENDING: 'Documents pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export default function OwnerApplications() {
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'applications'],
    queryFn: async () => (await api.get('/owner/applications')).data.data as AppRow[],
  });

  const rows = (data ?? []).filter((a) => statuses.size === 0 || statuses.has(a.status));

  return (
    <div className="owner-applications">
      <header className="owner-applications-header">
        <div>
          <p className="owner-applications-eyebrow">APPLICATION QUEUE</p>
          <h1>Applications</h1>
          <p>Review applicant details, documents and screening before recording a decision.</p>
        </div>
        <div className="owner-applications-filter">
          <FilterSelect
            label="Status"
            options={STATUS_OPTIONS.map((v) => ({
              value: v,
              count: (data ?? []).filter((a) => a.status === v).length,
            }))}
            selected={statuses}
            onChange={setStatuses}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={apiErrorMessage(error)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={statuses.size ? 'No applications match this filter' : 'No applications yet'}
          hint={
            statuses.size
              ? 'Try removing a status from the filter.'
              : 'Applications show up here once a tenant applies and submits for screening.'
          }
        />
      ) : (
        <div className="owner-applications-queue">
          <div className="owner-applications-summary">
            <span>{rows.length} application{rows.length === 1 ? '' : 's'}</span>
            <span>{rows.filter((a) => a.status === 'OWNER_REVIEW').length} awaiting decision</span>
          </div>
          <div className="owner-applications-columns" aria-hidden="true">
            <span>Applicant</span><span>Property / room</span><span>Applied</span><span>Files</span><span>Score</span><span>Status</span><span />
          </div>
          <ul className="owner-applications-list">
            {rows.map((a) => (
              <li key={a.id}>
                <Link to={'/owner/applications/' + a.id} className="owner-application-row">
                  <span className="owner-application-applicant">
                    <strong>{a.tenant.fullName}</strong>
                    <small>{a.tenant.email}</small>
                  </span>
                  <span className="owner-application-property">
                    <strong>{a.room.property.name}</strong>
                    <small>{a.room.name}</small>
                  </span>
                  <span className="owner-application-applied"><small className="owner-application-mobile-label">Applied</small>{date(a.createdAt)}</span>
                  <span className="owner-application-files"><small className="owner-application-mobile-label">Files</small>{a._count.documents}</span>
                  <span className="owner-application-score"><small className="owner-application-mobile-label">Score</small>{a.eligibility ? a.eligibility.score + '%' : '—'}</span>
                  <span className={'owner-application-status owner-application-status-' + a.status.toLowerCase()}>
                    <span className="owner-application-status-dot" />
                    {STATUS_LABELS[a.status] ?? a.status.replaceAll('_', ' ').toLowerCase()}
                  </span>
                  <Icon name="arrowUpRight" size={16} className="owner-application-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
