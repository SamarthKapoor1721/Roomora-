import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Badge, Card, ErrorBanner, Field, money } from './ui';
import ModalOverlay from './ModalOverlay';

interface Room { id: string; name: string; monthlyRent: number; property: { name: string; ownerId: string } }
interface Assignment { id: string; roomId: string; room: Room }
interface RequestRow {
  id: string; type: string; status: string; reason: string; ownerNote?: string;
  tenant: { fullName: string }; assignment: Assignment; targetRoom?: Room;
}

export default function TenancyRequests({ owner = false }: { owner?: boolean }) {
  const qc = useQueryClient();
  const prefix = owner ? 'owner' : 'tenant';
  const [type, setType] = useState<'LEAVE' | 'CHANGE' | ''>('');
  const [assignmentId, setAssignmentId] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [review, setReview] = useState<{ row: RequestRow; decision: 'APPROVE' | 'REJECT' } | null>(null);
  const [note, setNote] = useState('');
  const requests = useQuery({ queryKey: [prefix, 'tenancy-requests'], queryFn: async () => (await api.get(`/${prefix}/tenancy-requests`)).data.data as RequestRow[], refetchInterval: 30_000 });
  const options = useQuery({ queryKey: ['tenant', 'tenancy-options'], enabled: !owner, queryFn: async () => (await api.get('/tenant/tenancy-requests/options')).data.data as { assignments: Assignment[]; rooms: Room[] } });
  const refresh = async () => { await qc.invalidateQueries(); };
  const create = useMutation({ mutationFn: async () => api.post('/tenant/tenancy-requests', { type, assignmentId, targetRoomId: type === 'CHANGE' ? targetRoomId : undefined, reason }), onSuccess: async () => { setType(''); setReason(''); setTargetRoomId(''); await refresh(); } });
  const cancel = useMutation({ mutationFn: async (id: string) => api.post(`/tenant/tenancy-requests/${id}/cancel`), onSuccess: refresh });
  const decide = useMutation({ mutationFn: async () => api.post(`/owner/tenancy-requests/${review!.row.id}/review`, { decision: review!.decision, ownerNote: note }), onSuccess: async () => { setReview(null); setNote(''); await refresh(); } });
  const assignment = options.data?.assignments.find((a) => a.id === assignmentId);
  const targets = options.data?.rooms.filter((r) => r.id !== assignment?.roomId && r.property.ownerId === assignment?.room.property.ownerId) ?? [];
  const begin = (kind: 'LEAVE' | 'CHANGE') => {
    create.reset(); setType(kind); setAssignmentId(options.data?.assignments[0]?.id ?? ''); setTargetRoomId('');
  };

  return <Card className="my-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-ink-900">{owner ? 'Tenant move requests' : 'Leave or change your room'}</h3>
      <p className="mt-1 text-xs text-ink-500">{owner ? 'Review tenant requests. Approving completes the move immediately.' : 'Send a request to your owner. Your tenancy stays active until approval.'}</p></div>
      {!owner && !!options.data?.assignments.length && <div className="flex gap-2"><button className="btn-secondary btn-sm" onClick={() => begin('CHANGE')}>Request room change</button><button className="btn-danger-quiet btn-sm" onClick={() => begin('LEAVE')}>Request to leave</button></div>}
    </div>
    {requests.isLoading && <p className="mt-3 text-xs text-ink-500">Loading requests…</p>}
    {(requests.error || options.error || cancel.error) && <ErrorBanner message={apiErrorMessage(requests.error || options.error || cancel.error)} />}
    {!owner && options.data?.assignments.length === 0 && <p className="mt-3 text-sm text-ink-500">You need an active room assignment to request a move.</p>}
    {type && <form className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <h4 className="text-sm font-semibold">{type === 'LEAVE' ? 'Request to leave' : 'Request room change'}</h4>
      <Field label="Current room"><select className="input" value={assignmentId} onChange={(e) => { setAssignmentId(e.target.value); setTargetRoomId(''); }} required><option value="">Choose your tenancy</option>{options.data?.assignments.map((a) => <option key={a.id} value={a.id}>{a.room.property.name} · {a.room.name}</option>)}</select></Field>
      {type === 'CHANGE' && <><Field label="Requested room"><select className="input" value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} required><option value="">Choose a room</option>{targets.map((r) => <option key={r.id} value={r.id}>{r.property.name} · {r.name} · {money(r.monthlyRent)}/month</option>)}</select></Field><p className="text-xs text-ink-600">Choose an open room managed by your current owner. The new room's rent and deposit apply on approval; your lease end date stays the same.</p>{!targets.length && <p className="text-xs text-ink-600">No eligible rooms are open. Ask your owner to open applications on the room you want.</p>}</>}
      <Field label="Reason"><textarea className="input" rows={3} minLength={3} maxLength={2000} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell your owner why you want to move…" /></Field>
      {create.error && <ErrorBanner message={apiErrorMessage(create.error)} />}
      <div className="flex gap-2"><button className="btn-primary btn-sm" disabled={create.isPending || !assignmentId || (type === 'CHANGE' && !targetRoomId)}>{create.isPending ? 'Sending…' : 'Send request'}</button><button className="btn-secondary btn-sm" type="button" onClick={() => setType('')}>Cancel</button></div>
    </form>}
    {!requests.isLoading && !requests.error && requests.data?.length === 0 && <p className="mt-4 text-xs text-ink-500">No tenancy requests yet.</p>}
    <div className="mt-4 space-y-3">{requests.data?.map((r) => <div className="rounded-lg border border-slate-200 p-3" key={r.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{owner ? `${r.tenant.fullName} · ` : ''}{r.type === 'LEAVE' ? 'Leave room' : 'Change room'}</p><Badge>{r.status}</Badge></div>
      <p className="mt-1 text-xs text-ink-500">{r.assignment.room.property.name} · {r.assignment.room.name}{r.targetRoom && ` → ${r.targetRoom.property.name} · ${r.targetRoom.name}`}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{r.reason}</p>{r.ownerNote && <p className="mt-2 text-xs text-ink-500">Owner: {r.ownerNote}</p>}
      {r.status === 'PENDING' && <div className="mt-3 flex gap-2">{owner ? <><button className="btn-primary btn-sm" onClick={() => { decide.reset(); setReview({ row: r, decision: 'APPROVE' }); setNote(''); }}>Review approval</button><button className="btn-secondary btn-sm" onClick={() => { decide.reset(); setReview({ row: r, decision: 'REJECT' }); setNote(''); }}>Reject</button></> : <button className="btn-secondary btn-sm" disabled={cancel.isPending} onClick={() => cancel.mutate(r.id)}>Cancel request</button>}</div>}
    </div>)}</div>
    {review && <ModalOverlay onClose={() => { if (!decide.isPending) setReview(null); }} labelledBy="review-title">
      <form className="max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto overscroll-contain rounded-xl bg-white p-6 shadow-pop" onSubmit={(e) => { e.preventDefault(); decide.mutate(); }}>
        <h3 id="review-title" className="font-semibold">{review.decision === 'APPROVE' ? 'Approve and complete move' : 'Reject request'}</h3>
        <p className="text-sm text-ink-600">{review.decision === 'REJECT' ? 'The current tenancy will stay active.' : review.row.type === 'LEAVE' ? 'This ends the tenancy and active lease now, and frees the bed. Existing invoices remain payable.' : `This moves the tenant now to ${review.row.targetRoom?.name}, ends the old lease and creates a new lease at the target room's rent (${money(review.row.targetRoom?.monthlyRent ?? 0)}/month) and deposit. Existing invoices remain payable.`}</p>
        <Field label="Note to tenant (optional)"><textarea className="input" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {decide.error && <ErrorBanner message={apiErrorMessage(decide.error)} />}
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={decide.isPending} onClick={() => setReview(null)}>Cancel</button><button className="btn-primary" disabled={decide.isPending}>{decide.isPending ? 'Saving…' : review.decision === 'APPROVE' ? 'Approve and complete' : 'Reject request'}</button></div>
      </form>
    </ModalOverlay>}
  </Card>;
}
