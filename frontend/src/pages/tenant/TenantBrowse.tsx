import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { Chip, EmptyState, ErrorBanner, Field, NumberInput, PageHeader, Skeleton, money } from '../../components/ui';

interface Room {
  id: string;
  name: string;
  monthlyRent: number;
  securityDeposit: number;
  capacity: number;
  roommatesLimit: number;
  spotsAvailable: number;
  amenities: string[];
  food: { foodEnabled: boolean; foodCharge: number };
  property: { name: string; city: string; addressLine1: string };
}

export default function TenantBrowse() {
  const navigate = useNavigate();
  const [applyFor, setApplyFor] = useState<Room | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'browse'],
    queryFn: async () => (await api.get('/tenant/rooms')).data.data as Room[],
  });

  return (
    <div>
      <PageHeader
        title="Browse rooms"
        description="Rooms currently open for applications. Apply, then upload your documents for review."
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={apiErrorMessage(error)} />
      ) : data?.length === 0 ? (
        <EmptyState
          icon="search"
          title="No rooms are open right now"
          hint="Owners open applications when a bed is available. Check back later."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((r) => (
            <div key={r.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-ink-900">{r.property.name}</p>
              <p className="text-xs text-ink-500">
                {r.name} · {r.property.addressLine1}, {r.property.city}
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
              <button className="btn-primary mt-4 w-full" onClick={() => setApplyFor(r)}>
                Apply for this room
              </button>
            </div>
          ))}
        </div>
      )}

      {applyFor && (
        <ApplyModal room={applyFor} onClose={() => setApplyFor(null)} onApplied={(id) => navigate(`/tenant/applications/${id}`)} />
      )}
    </div>
  );
}

function ApplyModal({ room, onClose, onApplied }: { room: Room; onClose: () => void; onApplied: (id: string) => void }) {
  const [f, setF] = useState({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <div className="hairline flex items-start justify-between p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">Apply for this room</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {room.property.name} · {room.name}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-ink-500">
            Step 1 of 3. After applying you'll upload your documents, then submit for AI screening.
          </p>
          {m.error && <ErrorBanner message={apiErrorMessage(m.error)} />}

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
          <Field label="Current address">
            <input
              className="input"
              value={f.currentAddress}
              onChange={(e) => setF({ ...f, currentAddress: e.target.value })}
            />
          </Field>
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
              Opt in to food — {money(room.food.foodCharge)} / month, added to your rent
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
    </div>
  );
}
