import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage, assetUrl } from '../../lib/api';
import ModalOverlay from '../../components/ModalOverlay';
import { ErrorBanner, Field, ImagePicker, NumberInput, Spinner } from '../../components/ui';
import { Icon } from '../../components/Icon';

interface PropertyDetails {
  id: string; name: string; addressLine1: string; addressLine2?: string | null;
  city: string; state?: string | null; postalCode?: string | null; country: string;
  description?: string | null; foodEnabled: boolean; foodCharge: number;
  images: { id: string; url: string; name?: string }[];
}

export default function EditProperty({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ['owner', 'property', propertyId], queryFn: async () => (await api.get(`/owner/properties/${propertyId}`)).data.data as PropertyDetails });
  return <ModalOverlay onClose={onClose} labelledBy="edit-property-title">
    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-pop">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
        <div><h2 id="edit-property-title" className="font-display text-lg font-semibold">Edit property</h2><p className="text-xs text-ink-500">Update details and manage building photos.</p></div>
        <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close property editor"><Icon name="x" size={18} /></button>
      </div>
      {query.isLoading ? <div className="p-5"><Spinner /></div> : query.error ? <div className="p-5"><ErrorBanner message={apiErrorMessage(query.error)} /></div> : query.data && <PropertyEditor key={propertyId} property={query.data} />}
    </div>
  </ModalOverlay>;
}

function PropertyEditor({ property }: { property: PropertyDetails }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: property.name, addressLine1: property.addressLine1, addressLine2: property.addressLine2 ?? '', city: property.city, state: property.state ?? '', postalCode: property.postalCode ?? '', country: property.country, description: property.description ?? '', foodEnabled: property.foodEnabled, foodCharge: Number(property.foodCharge) });
  const [files, setFiles] = useState<File[]>([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['owner', 'property', property.id] }),
      qc.invalidateQueries({ queryKey: ['owner', 'properties'] }),
      qc.invalidateQueries({ queryKey: ['owner', 'rooms'] }),
      qc.invalidateQueries({ queryKey: ['tenant', 'browse'] }),
    ]);
  };
  const save = useMutation({ mutationFn: async () => api.patch(`/owner/properties/${property.id}`, f), onSuccess: async () => { setSaved(true); await refresh(); } });
  const upload = useMutation({ mutationFn: async () => {
    const data = new FormData(); files.forEach((file) => data.append('images', file));
    return api.post(`/owner/properties/${property.id}/images`, data, { timeout: 60_000 });
  }, onSuccess: async () => { setFiles([]); setPickerKey((key) => key + 1); await refresh(); } });
  const remove = useMutation({ mutationFn: async (id: string) => api.delete(`/owner/properties/${property.id}/images/${id}`), onSuccess: async () => { setRemoveId(null); await refresh(); } });
  const textFields = [
    ['name', 'Property name', 160, 2], ['addressLine1', 'Address', 200, 3], ['addressLine2', 'Address line 2', 200, 0],
    ['city', 'City', 100, 2], ['state', 'State', 100, 0], ['postalCode', 'Postal code', 20, 0], ['country', 'Country', 100, 0],
  ] as const;
  return <div className="space-y-6 p-5">
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSaved(false); save.mutate(); }}>
      <div className="grid gap-3 sm:grid-cols-2">{textFields.map(([key, label, max, min]) => <Field key={key} label={label}><input className="input" value={f[key]} maxLength={max} minLength={min || undefined} required={min > 0} onChange={(e) => { setSaved(false); setF({ ...f, [key]: e.target.value }); }} /></Field>)}</div>
      <Field label="Description"><textarea className="input" rows={3} maxLength={2000} value={f.description} onChange={(e) => { setSaved(false); setF({ ...f, description: e.target.value }); }} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.foodEnabled} onChange={(e) => { setSaved(false); setF({ ...f, foodEnabled: e.target.checked }); }} />Food available at this property</label>
      {f.foodEnabled && <Field label="Monthly food charge (₹)"><NumberInput value={f.foodCharge} min={0} onChange={(foodCharge) => { setSaved(false); setF({ ...f, foodCharge }); }} /></Field>}
      {save.error && <ErrorBanner message={apiErrorMessage(save.error)} />}
      <div className="flex items-center gap-3"><button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save details'}</button>{saved && <p role="status" className="text-sm text-brand-700">Details saved</p>}</div>
    </form>
    <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Building photos">
      <h3 className="text-sm font-semibold">Building photos</h3>
      <p className="text-xs text-ink-500">Photos are saved separately from property details.</p>
      {property.images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{property.images.map((image) => <div key={image.id} className="overflow-hidden rounded-lg border border-slate-200"><img src={assetUrl(image.url)} alt={image.name ?? 'Property photo'} className="h-28 w-full object-cover" /><button className="btn-ghost btn-sm w-full text-rose-600" disabled={remove.isPending || upload.isPending} onClick={() => { remove.reset(); setRemoveId(image.id); }}>Remove photo</button></div>)}</div> : <p className="text-sm text-ink-500">No photos yet. Add your first building photo below.</p>}
      {removeId && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-3"><p className="mr-auto text-xs text-rose-700">Remove this photo permanently?</p><button className="btn-danger-quiet btn-sm" disabled={remove.isPending} onClick={() => remove.mutate(removeId)}>{remove.isPending ? 'Removing…' : 'Remove'}</button><button className="btn-secondary btn-sm" disabled={remove.isPending} onClick={() => setRemoveId(null)}>Cancel</button></div>}
      {(upload.error || remove.error) && <ErrorBanner message={apiErrorMessage(upload.error || remove.error)} />}
      <ImagePicker key={pickerKey} label="Add photos" hint="Choose up to 10 new photos, then upload." files={files} onChange={setFiles} />
      <button className="btn-secondary" disabled={!files.length || upload.isPending || remove.isPending} onClick={() => upload.mutate()}>{upload.isPending ? 'Uploading…' : `Upload photos${files.length ? ` (${files.length})` : ''}`}</button>
    </section>
  </div>;
}
