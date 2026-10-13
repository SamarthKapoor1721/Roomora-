import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage, assetUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Icon } from '../../components/Icon';
import ModalOverlay from '../../components/ModalOverlay';
import { Chip, EmptyState, ErrorBanner, Field, ImageGallery, NumberInput, PageHeader, Skeleton, money } from '../../components/ui';

interface Img {
  id: string;
  url: string;
  name?: string;
}

interface Room {
  id: string;
  name: string;
  applicationsOpen: boolean;
  monthlyRent: number;
  securityDeposit: number;
  capacity: number;
  roommatesLimit: number;
  spotsAvailable: number;
  amenities: string[];
  food: { foodEnabled: boolean; foodCharge: number };
  images: Img[];
  property: { id: string; name: string; city: string; addressLine1: string; images: Img[] };
}

/** Room photos first, falling back to the building's photos. */
function roomPhotos(r: Room): Img[] {
  return r.images.length > 0 ? r.images : r.property.images;
}

export default function TenantBrowse() {
  const navigate = useNavigate();
  const [applyFor, setApplyFor] = useState<Room | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ title: string; images: Img[] } | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'browse', page],
    queryFn: async () => (await api.get('/tenant/rooms', { params: { page, pageSize: 12 } })).data as { data: Room[]; meta: { totalPages: number } },
    refetchInterval: 30_000,
  });
  const properties = Array.from(new Map((data?.data ?? []).map((room) => [room.property.id, room.property])).values());
  const property = properties.find((item) => item.id === selectedProperty);
  const visibleRooms = (data?.data ?? []).filter((room) => room.property.id === selectedProperty);

  return (
    <div>
      {property ? (
        <PageHeader
          title={property.name}
          description={`${property.addressLine1}, ${property.city} · Choose a room to review`}
        />
      ) : (
        <header className="mb-7">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Explore properties</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-ink-700">
            Review a property, then explore its rooms and photos before applying.
          </p>
        </header>
      )}
      {property && <button type="button" className="btn-secondary mb-5" onClick={() => setSelectedProperty(null)}>← All properties</button>}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={apiErrorMessage(error)} />
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon="search"
          title="No properties listed yet"
          hint="Active properties and rooms will appear here when owners add them."
        />
      ) : (
        property ? <>
          {property.images.length > 0 && <div className="mb-6 max-w-5xl"><ImageGallery images={property.images} size="lg" /><button type="button" className="btn-secondary mt-3" onClick={() => setGallery({ title: `${property.name} photos`, images: property.images })}>Open property photos</button></div>}
          <h2 className="mb-4 text-lg font-semibold text-ink-900">Rooms at {property.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRooms.map((r) => {
            const photos = roomPhotos(r);
            return (
            <div key={r.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              {photos.length > 0 ? (
                <button type="button" className="relative w-full text-left" onClick={() => setGallery({ title: `${r.property.name} · ${r.name}`, images: photos })} aria-label={`Open photos of ${r.name}`}>
                  <img src={assetUrl(photos[0].url)} alt={r.name} className="aspect-[4/3] w-full bg-slate-50 object-contain" />
                  <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-ink-900">View {photos.length} photo{photos.length === 1 ? '' : 's'}</span>
                </button>
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-slate-50 text-ink-300">
                  <Icon name="building" size={28} />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
              <p className="text-sm font-semibold text-ink-900">{r.property.name}</p>
              <p className="text-xs text-ink-500">
                {r.name} · {r.property.addressLine1}, {r.property.city}
                {photos.length > 1 && ` · ${photos.length} photos`}
              </p>
              <p className="mt-3 font-display text-2xl font-semibold text-ink-900">
                {money(r.monthlyRent)}
                <span className="text-xs font-normal text-ink-400"> / month</span>
              </p>
              <div className="mt-2 space-y-1 text-xs text-ink-500">
                <p className="flex items-center gap-1.5">
                  <Icon name="users" size={13} className="text-ink-400" />
                  {r.spotsAvailable} of {r.capacity} bed(s) free · up to {r.roommatesLimit} roommates
                </p>
                <p className="flex items-center gap-1.5">
                  <Icon name="wallet" size={13} className="text-ink-400" />
                  Deposit {money(r.securityDeposit)}
                </p>
                {r.food.foodEnabled && (
                  <p className="flex items-center gap-1.5 text-emerald-600">
                    <Icon name="check" size={13} />
                    Food available · {money(r.food.foodCharge)} / month
                  </p>
                )}
              </div>
              {r.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.amenities.map((a) => (
                    <Chip key={a}>{a}</Chip>
                  ))}
                </div>
              )}
              <button className="btn-primary mt-4 w-full" disabled={!r.applicationsOpen || r.spotsAvailable <= 0} onClick={() => setApplyFor(r)}>
                {r.spotsAvailable <= 0 ? 'Room full' : !r.applicationsOpen ? 'Applications closed' : 'Apply for this room'}
              </button>
              </div>
            </div>
            );
          })}
          </div>
        </> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((item) => {
            const rooms = (data?.data ?? []).filter((room) => room.property.id === item.id);
            const rents = rooms.map((room) => room.monthlyRent);
            return <article key={item.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d7e0d6] bg-white shadow-[0_8px_24px_rgba(26,49,32,0.08)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_16px_32px_rgba(26,49,32,0.12)]">
              {item.images.length > 0 ? <img src={assetUrl(item.images[0].url)} alt={item.name} loading="lazy" className="aspect-[16/10] w-full bg-slate-100 object-cover" /> : <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 text-ink-400"><Icon name="building" size={36} /></div>}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink-900">{item.name}</h2>
                  <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {rooms.length} room{rooms.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm font-medium leading-5 text-ink-700">
                  <Icon name="mapPin" size={16} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>{item.addressLine1}, {item.city}</span>
                </p>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Monthly rent from</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink-900">
                    {money(Math.min(...rents))}<span className="ml-1 text-sm font-medium text-ink-600">/ month</span>
                  </p>
                </div>
                <button type="button" className="btn-primary mt-5 flex w-full items-center justify-center gap-2 !bg-brand-700 !py-3 !text-sm hover:!bg-[#315d27]" onClick={() => setSelectedProperty(item.id)}>
                  View property and rooms <Icon name="arrowUpRight" size={16} />
                </button>
              </div>
            </article>;
          })}
        </div>
      )}

      {data && data.meta.totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => { setSelectedProperty(null); setPage((p) => p - 1); }}>Previous</button>
        <span className="text-sm text-ink-500">Page {page} of {data.meta.totalPages}</span>
        <button className="btn-secondary btn-sm" disabled={page >= data.meta.totalPages} onClick={() => { setSelectedProperty(null); setPage((p) => p + 1); }}>Next</button>
      </div>}
      {gallery && <PhotoViewer title={gallery.title} images={gallery.images} onClose={() => setGallery(null)} />}
      {applyFor && (
        <ApplyModal room={applyFor} onClose={() => setApplyFor(null)} onApplied={(id) => navigate(`/tenant/applications/${id}`)} />
      )}
    </div>
  );
}

function PhotoViewer({ title, images, onClose }: { title: string; images: Img[]; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return <ModalOverlay onClose={onClose} labelledBy="tenant-photo-title">
    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <h2 id="tenant-photo-title" className="font-semibold text-ink-900">{title} <span className="font-normal text-ink-500">· {active + 1} of {images.length}</span></h2>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose} aria-label="Close photos">Close</button>
      </div>
      <img src={assetUrl(current.url)} alt={current.name || `${title}, photo ${active + 1}`} className="max-h-[calc(100dvh-12rem)] min-h-0 w-full flex-1 object-contain bg-slate-50" />
      {images.length > 1 && <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4">
        <button type="button" className="btn-secondary btn-sm" onClick={() => setActive((active + images.length - 1) % images.length)}>Previous</button>
        <div className="flex max-w-[60%] gap-2 overflow-x-auto">
          {images.map((image, index) => <button key={image.id} type="button" className={`h-12 w-12 flex-none overflow-hidden rounded border ${index === active ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200'}`} onClick={() => setActive(index)} aria-label={`View photo ${index + 1}`} aria-current={index === active ? 'true' : undefined}><img src={assetUrl(image.url)} alt="" className="h-full w-full object-cover" /></button>)}
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setActive((active + 1) % images.length)}>Next</button>
      </div>}
    </div>
  </ModalOverlay>;
}

function ApplyModal({ room, onClose, onApplied }: { room: Room; onClose: () => void; onApplied: (id: string) => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({
    applicantName: user?.fullName ?? '',
    dateOfBirth: '',
    monthlyIncome: 0,
    employmentStatus: '',
    employerName: '',
    currentAddress: '',
    occupants: 1,
    hasPets: false,
    smoker: false,
    notes: '',
    foodOptIn: false,
  });
  const m = useMutation({
    mutationFn: async () => (await api.post('/tenant/applications', { roomId: room.id, ...f })).data.data,
    onSuccess: (d) => onApplied(d.id),
  });

  return (
    <ModalOverlay onClose={onClose} labelledBy="apply-room-title">
      <form
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <div className="hairline flex items-start justify-between p-5">
          <div>
            <h2 id="apply-room-title" className="font-display text-lg font-semibold text-ink-900">Apply for this room</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {room.property.name} · {room.name}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {roomPhotos(room).length > 0 && (
            <ImageGallery images={roomPhotos(room)} size="lg" />
          )}
          <p className="text-xs text-ink-500">
            Step 1 of 3. After applying you'll upload your documents, then submit for AI screening.
          </p>
          {m.error && <ErrorBanner message={apiErrorMessage(m.error)} />}

          <div className="rounded-xl border border-[#dce8d7] bg-[#f7faf5] p-4">
            <p className="text-sm font-semibold text-[#264632]">Applicant details</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Enter the details shown on your proof documents. The owner will review any differences.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full legal name">
                <input className="input" autoComplete="name" value={f.applicantName} onChange={(e) => setF({ ...f, applicantName: e.target.value })} minLength={2} maxLength={120} required />
              </Field>
              <Field label="Date of birth">
                <input className="input" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} required />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Current residential address">
                <input className="input" autoComplete="street-address" value={f.currentAddress} onChange={(e) => setF({ ...f, currentAddress: e.target.value })} minLength={5} maxLength={400} required />
              </Field>
            </div>
          </div>

          <Field label="Monthly income (₹)">
            <NumberInput
              value={f.monthlyIncome}
              onChange={(monthlyIncome) => setF({ ...f, monthlyIncome })}
              min={0}
              placeholder="e.g. 45000"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employment status">
              <input
                className="input"
                placeholder="e.g. Salaried full-time"
                value={f.employmentStatus}
                onChange={(e) => setF({ ...f, employmentStatus: e.target.value })}
              />
            </Field>
            <Field label="Employer name">
              <input
                className="input"
                value={f.employerName}
                onChange={(e) => setF({ ...f, employerName: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Number of occupants" className="w-40">
            <NumberInput value={f.occupants} onChange={(occupants) => setF({ ...f, occupants })} min={1} />
          </Field>
          <div className="flex gap-5 text-sm text-ink-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.hasPets} onChange={(e) => setF({ ...f, hasPets: e.target.checked })} /> Has pets
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.smoker} onChange={(e) => setF({ ...f, smoker: e.target.checked })} /> Smoker
            </label>
          </div>
          {room.food.foodEnabled && (
            <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-ink-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={f.foodOptIn}
                onChange={(e) => setF({ ...f, foodOptIn: e.target.checked })}
              />
              Opt in to food: {money(room.food.foodCharge)} / month, added to your rent
            </label>
          )}
          <Field label="Notes (optional)">
            <textarea
              className="input"
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>

        <div className="hairline flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={m.isPending}>
            {m.isPending ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
