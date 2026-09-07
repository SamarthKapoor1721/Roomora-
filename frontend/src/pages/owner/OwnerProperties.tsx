import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Badge, EmptyState, ErrorBanner, NumberInput, PageHeader, Spinner, money } from '../../components/ui';
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
            className={`rounded-xl border bg-white p-5 text-left shadow-card transition-colors ${
              selected === p.id
                ? 'border-brand-500 ring-2 ring-brand-500/20'
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
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <Icon name="check" size={11} />
                  Food {money(p.foodCharge)}
                </span>
              )}
            </div>
            <div className="mt-4 flex divide-x divide-slate-100 rounded-lg bg-slate-50 text-center text-sm">
              <div className="flex-1 py-2">
                <p className="font-semibold text-ink-900">{p.roomCount}</p>
                <p className="text-2xs uppercase tracking-wide text-ink-400">rooms</p>
              </div>
              <div className="flex-1 py-2">
                <p className="font-semibold text-ink-900">
                  {p.totalOccupants}/{p.totalCapacity}
                </p>
                <p className="text-2xs uppercase tracking-wide text-ink-400">occupied</p>
              </div>
              <div className="flex-1 py-2">
                <p className="font-semibold text-ink-900">{p.openForApplications}</p>
                <p className="text-2xs uppercase tracking-wide text-ink-400">open</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Rooms</h2>
            <button className="btn-ghost" onClick={() => setShowRoomForm((v) => !v)}>
              {showRoomForm ? 'Cancel' : 'Add room'}
            </button>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Room</th>
                  <th>Rent</th>
                  <th>Capacity</th>
                  <th>Occupied</th>
                  <th>Status</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {rooms.data?.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td>{money(r.monthlyRent)}{Number(r.foodCharge) > 0 && r.foodEnabled ? ` +${money(r.foodCharge)} food` : ''}</td>
                    <td>{r.capacity} (max {r.roommatesLimit} roommates)</td>
                    <td>{r.occupantCount}</td>
                    <td><Badge>{r.status}</Badge></td>
                    <td>
                      <button
                        className={`badge ${r.applicationsOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        onClick={() => toggleApps.mutate({ id: r.id, open: !r.applicationsOpen })}
                        disabled={toggleApps.isPending}
                      >
                        {r.applicationsOpen ? 'Open — click to close' : 'Closed — click to open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {Boolean(toggleApps.error) && <div className="mt-2"><ErrorBanner message={apiErrorMessage(toggleApps.error)} /></div>}
        </div>
      )}
    </div>
  );
}

function PropertyForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: '', addressLine1: '', city: '', foodEnabled: false, foodCharge: 0 });
  const m = useApiMutation('post', () => '/owner/properties');
  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate(f, { onSuccess: onDone });
      }}
    >
      <h3 className="font-semibold">New property</h3>
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
      className="mb-4 space-y-3 rounded-lg bg-slate-50 p-4"
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
