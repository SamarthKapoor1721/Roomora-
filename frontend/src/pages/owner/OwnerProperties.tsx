import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  NumberInput,
  PageHeader,
  Spinner,
  money,
} from '../../components/ui';
import { useApiMutation } from '../../lib/hooks';

interface Property {
  id: string;
  name: string;
  city: string;
  addressLine1: string;
  foodEnabled: boolean;
  foodCharge: string;
  roomCount: number;
  totalCapacity: number;
  totalOccupants: number;
  openForApplications: number;
}

interface Room {
  id: string;
  name: string;
  monthlyRent: string;
  capacity: number;
  roommatesLimit: number;
  occupantCount: number;
  status: string;
  applicationsOpen: boolean;
  foodEnabled: boolean;
  foodCharge: string;
}

export default function OwnerProperties() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);

  const props = useQuery({
    queryKey: ['owner', 'properties'],
    queryFn: async () => (await api.get('/owner/properties')).data.data as Property[],
  });

  const rooms = useQuery({
    queryKey: ['owner', 'rooms', selected],
    queryFn: async () => (await api.get(`/owner/rooms?propertyId=${selected}`)).data.data as Room[],
    enabled: !!selected,
  });

  const toggleApps = useApiMutation<{ id: string; open: boolean }>(
    'post',
    (b) => `/owner/rooms/${b.id}/applications`,
    [['owner', 'rooms', selected]],
  );

  const [confirm, setConfirm] = useState<
    | { kind: 'property'; id: string; name: string }
    | { kind: 'room'; id: string; name: string }
    | null
  >(null);

  const del = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      const url =
        confirm.kind === 'property'
          ? `/owner/properties/${confirm.id}`
          : `/owner/rooms/${confirm.id}`;
      await api.delete(url);
    },
    onSuccess: () => {
      if (confirm?.kind === 'property' && selected === confirm.id) setSelected(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['owner', 'properties'] });
      qc.invalidateQueries({ queryKey: ['owner', 'rooms', selected] });
    },
  });

  if (props.isLoading) return <Spinner />;
  if (props.error) return <ErrorBanner message={apiErrorMessage(props.error)} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties & rooms"
        description="Select a property to manage its rooms — set rent, capacity, food, and open or close applications."
        actions={
          <button className="btn-primary" onClick={() => setShowPropForm((v) => !v)}>
            {!showPropForm && <Icon name="plus" size={16} />}
            {showPropForm ? 'Cancel' : 'New property'}
          </button>
        }
      />

      {showPropForm && (
        <PropertyForm
          onDone={() => {
            setShowPropForm(false);
            qc.invalidateQueries({ queryKey: ['owner', 'properties'] });
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {props.data?.length === 0 && (
          <EmptyState icon="building" title="No properties yet" hint="Create one to start adding rooms." />
        )}
        {props.data?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(selected === p.id ? null : p.id)}
            className={`rounded-lg border bg-white p-4 text-left transition-colors ${
              selected === p.id
                ? 'border-brand-500 bg-brand-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {p.addressLine1}, {p.city}
                </p>
              </div>
              {p.foodEnabled && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                  <Icon name="check" size={11} />
                  Food {money(p.foodCharge)}
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="font-semibold tabular-nums text-ink-900">{p.roomCount}</span>
                <span className="ml-1 text-2xs uppercase tracking-wide text-ink-400">rooms</span>
              </div>
              <div>
                <span className="font-semibold tabular-nums text-ink-900">
                  {p.totalOccupants}/{p.totalCapacity}
                </span>
                <span className="ml-1 text-2xs uppercase tracking-wide text-ink-400">occupied</span>
              </div>
              <div>
                <span className="font-semibold tabular-nums text-ink-900">{p.openForApplications}</span>
                <span className="ml-1 text-2xs uppercase tracking-wide text-ink-400">open</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="border-t border-slate-200 pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
              Rooms in {props.data?.find((p) => p.id === selected)?.name}
            </h2>
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setShowRoomForm((v) => !v)}>
                {showRoomForm ? 'Cancel' : 'Add room'}
              </button>
              <button
                className="btn-danger-quiet btn-sm"
                onClick={() => {
                  const p = props.data?.find((x) => x.id === selected);
                  if (p) setConfirm({ kind: 'property', id: p.id, name: p.name });
                }}
              >
                <Icon name="x" size={13} />
                Deactivate property
              </button>
            </div>
          </div>
          {showRoomForm && (
            <RoomForm
              propertyId={selected}
              onDone={() => {
                setShowRoomForm(false);
                qc.invalidateQueries({ queryKey: ['owner', 'rooms', selected] });
                qc.invalidateQueries({ queryKey: ['owner', 'properties'] });
              }}
            />
          )}
          {rooms.isLoading ? (
            <Spinner />
          ) : rooms.data?.length === 0 ? (
            <EmptyState title="No rooms in this property" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="th">Room</th>
                    <th className="th">Rent</th>
                    <th className="th">Capacity</th>
                    <th className="th">Occupied</th>
                    <th className="th">Status</th>
                    <th className="th">Applications</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.data?.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="td font-medium text-ink-900">{r.name}</td>
                      <td className="td">
                        {money(r.monthlyRent)}
                        {Number(r.foodCharge) > 0 && r.foodEnabled ? ` +${money(r.foodCharge)} food` : ''}
                      </td>
                      <td className="td">
                        {r.capacity} <span className="text-ink-400">(max {r.roommatesLimit})</span>
                      </td>
                      <td className="td">{r.occupantCount}</td>
                      <td className="td">
                        <Badge>{r.status}</Badge>
                      </td>
                      <td className="td">
                        <button
                          className={`rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                            r.applicationsOpen
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-ink-500'
                          }`}
                          onClick={() => toggleApps.mutate({ id: r.id, open: !r.applicationsOpen })}
                          disabled={toggleApps.isPending}
                        >
                          {r.applicationsOpen ? 'Open · close' : 'Closed · open'}
                        </button>
                      </td>
                      <td className="td text-right">
                        <button
                          className="btn-ghost btn-sm text-rose-600"
                          onClick={() => setConfirm({ kind: 'room', id: r.id, name: r.name })}
                          title={r.occupantCount > 0 ? 'Room has occupants — free the beds first' : 'Deactivate room'}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Boolean(toggleApps.error) && <div className="mt-2"><ErrorBanner message={apiErrorMessage(toggleApps.error)} /></div>}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'property' ? 'Deactivate this property?' : 'Deactivate this room?'}
        message={
          confirm?.kind === 'property' ? (
            <>
              <b>{confirm.name}</b> and all its rooms will be hidden and closed to applications.
              Existing tenancies and history are kept. You can’t undo this from the app.
            </>
          ) : (
            <>
              <b>{confirm?.name}</b> will be set inactive and removed from listings. This is blocked
              if the room still has occupants.
            </>
          )
        }
        confirmLabel="Deactivate"
        busy={del.isPending}
        error={del.error ? apiErrorMessage(del.error) : null}
        onConfirm={() => del.mutate()}
        onCancel={() => {
          setConfirm(null);
          del.reset();
        }}
      />
    </div>
  );
}

function PropertyForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: '', addressLine1: '', city: '', foodEnabled: false, foodCharge: 0 });
  const m = useApiMutation('post', () => '/owner/properties');
  return (
    <form
      className="space-y-3 border-l-2 border-brand-200 py-1 pl-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate(f, { onSuccess: onDone });
      }}
    >
      <h3 className="text-sm font-semibold text-ink-900">New property</h3>
      {Boolean(m.error) && <ErrorBanner message={apiErrorMessage(m.error)} />}
      <div className="grid gap-3 md:grid-cols-3">
        <input className="input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input" placeholder="Address" value={f.addressLine1} onChange={(e) => setF({ ...f, addressLine1: e.target.value })} required />
        <input className="input" placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.foodEnabled} onChange={(e) => setF({ ...f, foodEnabled: e.target.checked })} />
        Enable food for this property
      </label>
      {f.foodEnabled && (
        <NumberInput
          className="md:w-48"
          placeholder="Monthly food charge"
          value={f.foodCharge}
          onChange={(foodCharge) => setF({ ...f, foodCharge })}
          min={0}
        />
      )}
      <button className="btn-primary" disabled={m.isPending}>Create</button>
    </form>
  );
}

function RoomForm({ propertyId, onDone }: { propertyId: string; onDone: () => void }) {
  const [f, setF] = useState({
    name: '',
    monthlyRent: 10000,
    securityDeposit: 20000,
    capacity: 1,
    roommatesLimit: 1,
    foodEnabled: false,
    foodCharge: 0,
  });
  const m = useApiMutation('post', () => '/owner/rooms');
  return (
    <form
      className="mb-4 space-y-3 border-l-2 border-brand-200 py-1 pl-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate({ ...f, propertyId }, { onSuccess: onDone });
      }}
    >
      {Boolean(m.error) && <ErrorBanner message={apiErrorMessage(m.error)} />}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="label">Room name</label>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Monthly rent</label>
          <NumberInput value={f.monthlyRent} onChange={(monthlyRent) => setF({ ...f, monthlyRent })} min={0} />
        </div>
        <div>
          <label className="label">Security deposit</label>
          <NumberInput value={f.securityDeposit} onChange={(securityDeposit) => setF({ ...f, securityDeposit })} min={0} />
        </div>
        <div>
          <label className="label">Capacity (beds)</label>
          <NumberInput value={f.capacity} onChange={(capacity) => setF({ ...f, capacity })} min={1} />
        </div>
        <div>
          <label className="label">Roommates limit</label>
          <NumberInput value={f.roommatesLimit} onChange={(roommatesLimit) => setF({ ...f, roommatesLimit })} min={1} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.foodEnabled} onChange={(e) => setF({ ...f, foodEnabled: e.target.checked })} />
        Enable food for this room (overrides property setting)
      </label>
      {f.foodEnabled && (
        <NumberInput
          className="md:w-48"
          placeholder="Food charge"
          value={f.foodCharge}
          onChange={(foodCharge) => setF({ ...f, foodCharge })}
          min={0}
        />
      )}
      <button className="btn-primary" disabled={m.isPending}>Add room</button>
    </form>
  );
}
