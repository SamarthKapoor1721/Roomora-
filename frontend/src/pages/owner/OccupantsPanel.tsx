import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { ConfirmDialog, ErrorBanner, Field, NumberInput, Spinner, date, money } from '../../components/ui';

interface Assignment {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  foodOptIn: boolean;
  tenant: { id: string; fullName: string; email: string; phone: string | null };
}

interface RoomBrief {
  id: string;
  name: string;
  monthlyRent: string;
  capacity: number;
  occupantCount: number;
  status: string;
  property: { id: string; name: string };
}

interface TenantHit {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const oneYearISO = () => new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

/**
 * Occupants of one room: current tenants with an end/shift action, and a
 * form to manually add someone (no application needed). Shifting = end the
 * assignment here, then assign the same tenant into a picked target room —
 * both calls run from one confirm so the owner does it in one step.
 */
export default function OccupantsPanel({ room, allRooms }: { room: RoomBrief; allRooms: RoomBrief[] }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [shiftFor, setShiftFor] = useState<Assignment | null>(null);
  const [endFor, setEndFor] = useState<Assignment | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['owner', 'assignments', room.id] });
    qc.invalidateQueries({ queryKey: ['owner', 'rooms'] });
    qc.invalidateQueries({ queryKey: ['owner', 'properties'] });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'assignments', room.id],
    queryFn: async () => (await api.get(`/owner/rooms/${room.id}/assignments`)).data.data as Assignment[],
  });

  const end = useMutation({
    mutationFn: async (b: { assignmentId: string; reason?: string }) =>
      (await api.post(`/owner/assignments/${b.assignmentId}/end`, { reason: b.reason })).data,
    onSuccess: () => {
      setEndFor(null);
      invalidate();
    },
  });

  const active = (data ?? []).filter((a) => a.isActive);
  const past = (data ?? []).filter((a) => !a.isActive);
  const full = room.occupantCount >= room.capacity;

  if (isLoading) return <Spinner label="Loading occupants…" />;
  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Occupants ({active.length}/{room.capacity})
        </h4>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAdd((v) => !v)}
          disabled={full && !showAdd}
          title={full ? 'Room is at full capacity' : undefined}
        >
          <Icon name="plus" size={13} />
          {showAdd ? 'Cancel' : 'Add person'}
        </button>
      </div>

      {showAdd && (
        <AddPersonForm
          room={room}
          onDone={() => {
            setShowAdd(false);
            invalidate();
          }}
        />
      )}

      {active.length === 0 ? (
        <p className="text-sm text-ink-400">No one is currently assigned to this room.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{a.tenant.fullName}</p>
                <p className="text-xs text-ink-500">
                  {a.tenant.email}
                  {a.tenant.phone && ` · ${a.tenant.phone}`} · since {date(a.startDate)}
                  {a.foodOptIn && ' · food opted in'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button className="btn-ghost btn-sm" onClick={() => setShiftFor(a)}>
                  <Icon name="arrowUpRight" size={13} />
                  Shift room
                </button>
                <button className="btn-danger-quiet btn-sm" onClick={() => setEndFor(a)}>
                  End tenancy
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-ink-400 hover:text-ink-600">
            {past.length} past occupant{past.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {past.map((a) => (
              <li key={a.id} className="text-xs text-ink-400">
                {a.tenant.fullName} · {date(a.startDate)} → {a.endDate ? date(a.endDate) : '—'}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={!!endFor}
        title="End this tenancy?"
        message={
          <>
            <b>{endFor?.tenant.fullName}</b> will be removed from {room.name} and their lease terminated.
            The bed becomes available immediately.
          </>
        }
        confirmLabel="End tenancy"
        busy={end.isPending}
        error={end.error ? apiErrorMessage(end.error) : null}
        onConfirm={() => endFor && end.mutate({ assignmentId: endFor.id })}
        onCancel={() => {
          setEndFor(null);
          end.reset();
        }}
      />

      {shiftFor && (
        <ShiftModal
          assignment={shiftFor}
          fromRoom={room}
          rooms={allRooms}
          onClose={() => setShiftFor(null)}
          onDone={() => {
            setShiftFor(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function AddPersonForm({ room, onDone }: { room: RoomBrief; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenantLabel, setTenantLabel] = useState('');
  const [lease, setLease] = useState({
    startDate: todayISO(),
    endDate: oneYearISO(),
    rentDueDay: 5,
    monthlyRent: Number(room.monthlyRent),
  });

  const hits = useQuery({
    queryKey: ['owner', 'tenants', 'search', search],
    queryFn: async () => (await api.get(`/users/tenants?search=${encodeURIComponent(search)}`)).data.data as TenantHit[],
    enabled: search.trim().length >= 2,
  });

  const assign = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/owner/rooms/${room.id}/assignments`, {
          tenantId,
          lease: {
            startDate: lease.startDate,
            endDate: lease.endDate,
            rentDueDay: lease.rentDueDay,
            monthlyRent: lease.monthlyRent,
          },
        })
      ).data,
    onSuccess: onDone,
  });

  return (
    <form
      className="space-y-3 rounded-lg bg-slate-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (tenantId) assign.mutate();
      }}
    >
      {Boolean(assign.error) && <ErrorBanner message={apiErrorMessage(assign.error)} />}

      <Field label="Tenant" hint="Search by name or email — only tenants already connected to your properties appear here.">
        {tenantId ? (
          <div className="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{tenantLabel}</span>
            <button
              type="button"
              className="text-xs font-medium text-ink-500 hover:text-ink-700"
              onClick={() => {
                setTenantId('');
                setTenantLabel('');
              }}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              className="input"
              placeholder="Type at least 2 characters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim().length >= 2 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
                {hits.isLoading ? (
                  <p className="px-3 py-2 text-xs text-ink-400">Searching…</p>
                ) : hits.data?.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-ink-400">No matching tenants found.</p>
                ) : (
                  hits.data?.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setTenantId(t.id);
                        setTenantLabel(`${t.fullName} · ${t.email}`);
                        setSearch('');
                      }}
                    >
                      <span className="font-medium text-ink-900">{t.fullName}</span>
                      <span className="ml-1.5 text-xs text-ink-400">{t.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Lease start">
          <input
            className="input"
            type="date"
            value={lease.startDate}
            onChange={(e) => setLease({ ...lease, startDate: e.target.value })}
          />
        </Field>
        <Field label="Lease end">
          <input
            className="input"
            type="date"
            value={lease.endDate}
            onChange={(e) => setLease({ ...lease, endDate: e.target.value })}
          />
        </Field>
        <Field label="Rent due day" hint="1–28">
          <NumberInput
            value={lease.rentDueDay}
            onChange={(rentDueDay) => setLease({ ...lease, rentDueDay })}
            min={1}
            max={28}
          />
        </Field>
        <Field label="Monthly rent">
          <NumberInput
            value={lease.monthlyRent}
            onChange={(monthlyRent) => setLease({ ...lease, monthlyRent })}
            min={0}
          />
        </Field>
      </div>

      <button className="btn-primary" disabled={!tenantId || assign.isPending}>
        {assign.isPending ? 'Assigning…' : 'Assign to room'}
      </button>
    </form>
  );
}

function ShiftModal({
  assignment,
  fromRoom,
  rooms,
  onClose,
  onDone,
}: {
  assignment: Assignment;
  fromRoom: RoomBrief;
  rooms: RoomBrief[];
  onClose: () => void;
  onDone: () => void;
}) {
  const targets = rooms.filter((r) => r.id !== fromRoom.id && r.occupantCount < r.capacity && r.status !== 'INACTIVE');
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '');
  const [lease, setLease] = useState({ startDate: todayISO(), endDate: oneYearISO(), rentDueDay: 5 });

  const target = targets.find((r) => r.id === targetId);

  const shift = useMutation({
    mutationFn: async () => {
      await api.post(`/owner/assignments/${assignment.id}/end`, { reason: `Moved to ${target?.name ?? 'another room'}` });
      await api.post(`/owner/rooms/${targetId}/assignments`, {
        tenantId: assignment.tenant.id,
        lease: {
          startDate: lease.startDate,
          endDate: lease.endDate,
          rentDueDay: lease.rentDueDay,
          monthlyRent: target ? Number(target.monthlyRent) : undefined,
        },
      });
    },
    onSuccess: onDone,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
      <form
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          if (targetId) shift.mutate();
        }}
      >
        <div className="hairline flex items-start justify-between p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">Shift to another room</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {assignment.tenant.fullName} · currently in {fromRoom.name}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {Boolean(shift.error) && <ErrorBanner message={apiErrorMessage(shift.error)} />}

          {targets.length === 0 ? (
            <p className="text-sm text-ink-500">No vacant rooms available to shift into right now.</p>
          ) : (
            <>
              <Field label="Move to">
                <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {targets.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.property.name} · {r.name} ({r.occupantCount}/{r.capacity}) — {money(r.monthlyRent)}/mo
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Start">
                  <input
                    className="input"
                    type="date"
                    value={lease.startDate}
                    onChange={(e) => setLease({ ...lease, startDate: e.target.value })}
                  />
                </Field>
                <Field label="End">
                  <input
                    className="input"
                    type="date"
                    value={lease.endDate}
                    onChange={(e) => setLease({ ...lease, endDate: e.target.value })}
                  />
                </Field>
                <Field label="Due day">
                  <NumberInput
                    value={lease.rentDueDay}
                    onChange={(rentDueDay) => setLease({ ...lease, rentDueDay })}
                    min={1}
                    max={28}
                  />
                </Field>
              </div>
              <p className="text-xs text-ink-500">
                This ends the tenancy in {fromRoom.name} and creates a new lease in the target room, back to back.
              </p>
            </>
          )}
        </div>

        <div className="hairline flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!targetId || shift.isPending}>
            {shift.isPending ? 'Moving…' : 'Confirm move'}
          </button>
        </div>
      </form>
    </div>
  );
}
