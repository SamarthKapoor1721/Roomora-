import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage, assetUrl } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ImagePicker,
  NumberInput,
  PageHeader,
  Spinner,
  money,
} from '../../components/ui';
import { useApiMutation } from '../../lib/hooks';
import OccupantsPanel from './OccupantsPanel';

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
  images?: Img[];
}

interface Img {
  id: string;
  url: string;
  name?: string;
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
  images?: Img[];
  property?: { id: string; name: string };
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

  // Every room across the portfolio, for the "shift to another room" target
  // picker in OccupantsPanel: a move can land in a different property.
  const allRooms = useQuery({
    queryKey: ['owner', 'rooms', 'all'],
    queryFn: async () => (await api.get('/owner/rooms?pageSize=100')).data.data as Room[],
  });

  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

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
        description="Select a property to manage its rooms: set rent, capacity, food, and open or close applications."
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
            <div className="flex items-start gap-3">
              {p.images && p.images.length > 0 && (
                <img
                  src={assetUrl(p.images[0].url)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
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
                {p.images && p.images.length > 1 && (
                  <p className="mt-0.5 text-2xs text-ink-400">{p.images.length} photos</p>
                )}
              </div>
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
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
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.data?.map((r) => (
                    <Fragment key={r.id}>
                    <tr className="hover:bg-slate-50/70">
                      <td className="td font-medium text-ink-900">
                        <div className="flex items-center gap-2">
                          {r.images && r.images.length > 0 ? (
                            <img
                              src={assetUrl(r.images[0].url)}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-md border border-slate-200 object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-300">
                              <Icon name="camera" size={13} />
                            </span>
                          )}
                          <span>
                            {r.name}
                            {r.images && r.images.length > 1 && (
                              <span className="ml-1 text-2xs font-normal text-ink-400">+{r.images.length - 1}</span>
                            )}
                          </span>
                        </div>
                      </td>
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
                          role="switch"
                          aria-checked={r.applicationsOpen}
                          aria-label={`Applications for ${r.name}`}
                          title={r.applicationsOpen ? 'Close applications' : 'Open applications'}
                          className="inline-flex min-h-11 items-center gap-2.5 rounded-lg px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                          onClick={() => toggleApps.mutate({ id: r.id, open: !r.applicationsOpen })}
                          disabled={toggleApps.isPending}
                        >
                          <span aria-hidden="true" className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors motion-reduce:transition-none ${r.applicationsOpen ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-slate-200'}`}>
                            <span className={`absolute left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${r.applicationsOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                          </span>
                          <span className={r.applicationsOpen ? 'text-brand-700' : 'text-ink-500'}>{r.applicationsOpen ? 'Open' : 'Closed'}</span>
                        </button>
                      </td>
                      <td className="td">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => setExpandedRoom(expandedRoom === r.id ? null : r.id)}
                        >
                          <Icon name="users" size={13} />
                          Occupants
                          <Icon name={expandedRoom === r.id ? 'chevronUp' : 'chevronDown'} size={12} />
                        </button>
                      </td>
                      <td className="td text-right">
                        <button
                          className="btn-ghost btn-sm text-rose-600"
                          onClick={() => setConfirm({ kind: 'room', id: r.id, name: r.name })}
                          title={r.occupantCount > 0 ? 'Room has occupants: free the beds first' : 'Deactivate room'}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </td>
                    </tr>
                    {expandedRoom === r.id && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50/60 px-4 py-4">
                          <OccupantsPanel
                            room={{
                              ...r,
                              property: r.property ?? { id: selected!, name: props.data?.find((p) => p.id === selected)?.name ?? '' },
                            }}
                            allRooms={(allRooms.data ?? []).filter((x): x is Room & { property: { id: string; name: string } } => !!x.property)}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
  const [images, setImages] = useState<File[]>([]);
  const m = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('data', JSON.stringify(f));
      images.forEach((img) => fd.append('images', img));
      return (await api.post('/owner/properties', fd)).data;
    },
    onSuccess: onDone,
  });
  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
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
      <ImagePicker
        label="Building photos"
        hint="Show the exterior, common areas, entrance: up to 10 images"
        files={images}
        onChange={setImages}
      />
      <button className="btn-primary" disabled={m.isPending}>{m.isPending ? 'Creating…' : 'Create'}</button>
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
  const [images, setImages] = useState<File[]>([]);
  const m = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('data', JSON.stringify({ ...f, propertyId }));
      images.forEach((img) => fd.append('images', img));
      return (await api.post('/owner/rooms', fd)).data;
    },
    onSuccess: onDone,
  });
  return (
    <form
      className="mb-4 space-y-3 rounded-lg bg-slate-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
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
      <ImagePicker
        label="Room photos"
        hint="Show the beds, storage, window, attached bath: up to 10 images"
        files={images}
        onChange={setImages}
      />
      <button className="btn-primary" disabled={m.isPending}>{m.isPending ? 'Adding…' : 'Add room'}</button>
    </form>
  );
}
