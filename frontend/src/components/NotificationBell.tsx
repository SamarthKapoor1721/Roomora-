import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api';
import type { Role } from '../lib/auth';
import { Icon } from './Icon';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
};

type NotificationPage = {
  data: Notification[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
};

const PAGE_SIZE = 10;

function destination(notification: Notification, role: Role): string | null {
  const id = notification.relatedId ? encodeURIComponent(notification.relatedId) : null;
  switch (notification.relatedType) {
    case 'APPLICATION':
      if (role === 'OWNER') return id ? '/owner/applications/' + id : '/owner/applications';
      if (role === 'TENANT') return id ? '/tenant/applications/' + id : '/tenant/applications';
      return null;
    case 'PAYMENT':
      return role === 'OWNER' ? '/owner/payments' : role === 'TENANT' ? '/tenant/payments' : null;
    case 'MAINTENANCE':
      return role === 'OWNER' ? '/owner/maintenance' : role === 'TENANT' ? '/tenant/maintenance' : role === 'STAFF' ? '/staff/maintenance' : null;
    case 'CLEANING':
      return role === 'OWNER' ? '/owner/cleaning' : role === 'STAFF' ? '/staff/cleaning' : null;
    case 'LEASE':
    case 'TENANCY_REQUEST':
      return role === 'OWNER' ? '/owner/leases' : role === 'TENANT' ? '/tenant' : null;
    case 'WARNING':
      return role === 'OWNER' ? '/owner/warnings' : role === 'TENANT' ? '/tenant' : null;
    case 'ROOM':
      return role === 'TENANT' ? '/tenant' : role === 'OWNER' ? '/owner/properties' : null;
    default:
      return null;
  }
}

function notificationTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function NotificationBell({ userId, role }: { userId: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryPrefix = ['notifications', userId];

  const { data: unread = 0 } = useQuery({
    queryKey: [...queryPrefix, 'unread'],
    queryFn: async () =>
      (await api.get('/notifications?unread=true&pageSize=1')).data.meta.unreadCount as number,
    refetchInterval: 30_000,
  });

  const { data: notifications, isLoading, error, refetch } = useQuery<NotificationPage>({
    queryKey: [...queryPrefix, 'list', page],
    queryFn: async () => (await api.get('/notifications', { params: { page, pageSize: PAGE_SIZE } })).data,
    enabled: open,
    refetchInterval: open ? 30_000 : false,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post('/notifications/' + encodeURIComponent(notificationId) + '/read');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryPrefix }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryPrefix }),
  });

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function openNotification(notification: Notification) {
    if (!notification.readAt) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        return;
      }
    }
    setOpen(false);
    const route = destination(notification, role);
    if (route) navigate(route);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label={unread ? 'Notifications, ' + unread + ' unread' : 'Notifications'}
        aria-expanded={open}
        aria-controls="notifications-panel"
        onClick={() => {
          if (!open) setPage(1);
          setOpen((value) => !value);
        }}
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          className="fixed right-3 top-[4.5rem] z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(18,36,25,0.18)] md:absolute md:right-0 md:top-full md:mt-3"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Notifications</h2>
              <p className="text-xs text-ink-500">{unread ? unread + ' unread' : 'All caught up'}</p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              disabled={unread === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          </div>

          {(error || markRead.error || markAllRead.error) && (
            <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
              {apiErrorMessage(error ?? markRead.error ?? markAllRead.error)}
              {error && <button type="button" className="ml-2 font-semibold underline" onClick={() => void refetch()}>Retry</button>}
            </div>
          )}

          <div className="max-h-[min(26rem,calc(100vh-10rem))] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">Loading notifications…</p>
            ) : error && !notifications ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">Could not load notifications.</p>
            ) : notifications?.data.length ? (
              <ul className="divide-y divide-slate-100">
                {notifications.data.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ' + (!notification.readAt ? 'bg-brand-50/40' : '')}
                      onClick={() => void openNotification(notification)}
                      disabled={markRead.isPending}
                    >
                      <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (!notification.readAt ? 'bg-brand-600' : 'bg-slate-200')} />
                      <span className="min-w-0 flex-1">
                        <span className={'block text-sm leading-5 text-ink-900 ' + (!notification.readAt ? 'font-semibold' : 'font-medium')}>{notification.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-ink-600">{notification.body}</span>
                        <span className="mt-1.5 block text-[11px] text-ink-400">{notificationTime(notification.createdAt)}</span>
                      </span>
                      {destination(notification, role) && <Icon name="chevronRight" size={15} className="mt-1 shrink-0 text-ink-400" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-500">No notifications yet.</p>
            )}
          </div>

          {notifications && notifications.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-ink-500">
              <button type="button" className="font-medium text-brand-700 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <span>Page {page} of {notifications.meta.totalPages}</span>
              <button type="button" className="font-medium text-brand-700 disabled:opacity-40" disabled={page >= notifications.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
