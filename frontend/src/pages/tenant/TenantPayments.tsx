import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, EmptyState, ErrorBanner, NumberInput, PageHeader, Skeleton, money, date } from '../../components/ui';

interface PaymentRow {
  id: string;
  periodMonth: number;
  periodYear: number;
  rentAmount: string;
  foodAmount: string;
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  paidDate: string | null;
  daysLate: number;
  status: string;
  lease: { room: { name: string } };
}

export default function TenantPayments() {
  const qc = useQueryClient();
  const [payFor, setPayFor] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'payments'],
    queryFn: async () => (await api.get('/tenant/payments')).data.data as PaymentRow[],
  });

  const pay = useMutation({
    mutationFn: async (b: { id: string; amount: number; method: string }) =>
      (await api.post(`/tenant/payments/${b.id}/pay`, { amount: b.amount, method: b.method })).data,
    onSuccess: () => {
      setPayFor(null);
      qc.invalidateQueries({ queryKey: ['tenant', 'payments'] });
      qc.invalidateQueries({ queryKey: ['tenant', 'dashboard'] });
    },
  });

  if (error) return <ErrorBanner message={apiErrorMessage(error)} />;

  return (
    <div>
      <PageHeader
        title="Rent & payments"
        description="Your monthly invoices and payment history. Pay an outstanding invoice from here."
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
      {data?.length === 0 && (
        <EmptyState icon="wallet" title="No invoices yet" hint="Your rent invoices appear here once your owner generates them." />
      )}
      {data?.map((p) => {
        const outstanding = Number(p.totalAmount) - Number(p.amountPaid);
        return (
          <div key={p.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{p.lease.room.name} · {p.periodMonth}/{p.periodYear}</p>
                <p className="text-xs text-slate-400">
                  Rent {money(p.rentAmount)}{Number(p.foodAmount) > 0 && ` + food ${money(p.foodAmount)}`} = {money(p.totalAmount)} ·
                  due {date(p.dueDate)}{p.paidDate && ` · paid ${date(p.paidDate)}`}
                  {p.daysLate > 0 && ` · ${p.daysLate} days late`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{p.status}</Badge>
                {outstanding > 0 && p.status !== 'WAIVED' && (
                  <button className="btn-primary" onClick={() => setPayFor(payFor === p.id ? null : p.id)}>
                    Pay {money(outstanding)}
                  </button>
                )}
              </div>
            </div>
            {payFor === p.id && (
              <PayForm
                outstanding={outstanding}
                pending={pay.isPending}
                onSubmit={(amount, method) => pay.mutate({ id: p.id, amount, method })}
              />
            )}
          </div>
        );
      })}
      {pay.error && <ErrorBanner message={apiErrorMessage(pay.error)} />}
        </div>
      )}
    </div>
  );
}

function PayForm({ outstanding, onSubmit, pending }: { outstanding: number; onSubmit: (a: number, m: string) => void; pending: boolean }) {
  const [amount, setAmount] = useState(outstanding);
  const [method, setMethod] = useState('UPI');
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3 rounded bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(amount, method);
      }}
    >
      <div>
        <label className="label">Amount</label>
        <NumberInput className="w-40" value={amount} onChange={setAmount} min={0} />
      </div>
      <div>
        <label className="label">Method</label>
        <select className="input w-40" value={method} onChange={(e) => setMethod(e.target.value)}>
          {['UPI', 'BANK_TRANSFER', 'CARD', 'CASH', 'OTHER'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>Confirm payment</button>
    </form>
  );
}
