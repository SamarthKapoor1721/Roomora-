import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  FilterSelect,
  MetricCard,
  NumberInput,
  PageHeader,
  Section,
  Skeleton,
  TableWrap,
  money,
  date,
} from '../../components/ui';

interface PaymentRow {
  id: string;
  periodMonth: number;
  periodYear: number;
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  paidDate: string | null;
  daysLate: number;
  status: string;
  tenant: { fullName: string };
  lease: { room: { name: string } };
}

const STATUS_OPTIONS = ['OVERDUE', 'PENDING', 'PARTIAL', 'PAID', 'WAIVED'];

export default function OwnerPayments() {
  const qc = useQueryClient();
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [recordFor, setRecordFor] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'payments'],
    queryFn: async () =>
      (await api.get('/owner/payments')).data as {
        data: PaymentRow[];
        summary: { billed: number; collected: number; outstanding: number };
      },
  });

  const generate = useMutation({
    mutationFn: async () => (await api.post('/owner/payments/generate', {})).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', 'payments'] }),
  });
  const record = useMutation({
    mutationFn: async (b: { id: string; amount: number; method: string }) =>
      (await api.post(`/owner/payments/${b.id}/record`, { amount: b.amount, method: b.method })).data,
    onSuccess: () => {
      setRecordFor(null);
      qc.invalidateQueries({ queryKey: ['owner', 'payments'] });
    },
  });

  const rows = (data?.data ?? []).filter((p) => statuses.size === 0 || statuses.has(p.status));
  const view = rows.reduce(
    (acc, p) => {
      acc.billed += Number(p.totalAmount);
      acc.collected += Number(p.amountPaid);
      acc.outstanding += Number(p.totalAmount) - Number(p.amountPaid);
      return acc;
    },
    { billed: 0, collected: 0, outstanding: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Monthly rent invoices, what's been collected, and what's outstanding."
        actions={
          <button className="btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Icon name="plus" size={16} />
            {generate.isPending ? 'Generating…' : "Generate this month"}
          </button>
        }
      />

      {generate.data && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-emerald-600">
          <Icon name="check" size={15} />
          Generated for {generate.data.leases} lease(s): {generate.data.processed} invoice(s) created.
        </p>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <Section title={statuses.size ? 'Filtered view' : 'This view'}>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label="Billed" value={money(view.billed)} icon="wallet" />
              <MetricCard label="Collected" value={money(view.collected)} tone="positive" icon="check" />
              <MetricCard
                label="Outstanding"
                value={money(view.outstanding)}
                tone={view.outstanding ? 'critical' : 'positive'}
                icon="alert"
              />
            </div>
          </Section>

          <Section
            title="Invoices"
            actions={
              <FilterSelect
                label="Status"
                options={STATUS_OPTIONS.map((v) => ({
                  value: v,
                  count: data.data.filter((p) => p.status === v).length,
                }))}
                selected={statuses}
                onChange={setStatuses}
              />
            }
          >
            {error ? (
              <ErrorBanner message={apiErrorMessage(error)} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon="wallet"
                title={statuses.size ? 'No invoices match this filter' : 'No invoices here'}
                hint={
                  statuses.size
                    ? 'Try removing a status from the filter.'
                    : "Generate this month's rent to create invoices for every active lease."
                }
              />
            ) : (
              <TableWrap>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Tenant</th>
                    <th className="th">Room</th>
                    <th className="th">Period</th>
                    <th className="th">Total</th>
                    <th className="th">Paid</th>
                    <th className="th">Due</th>
                    <th className="th">Late</th>
                    <th className="th">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => {
                    const outstanding = Number(p.totalAmount) - Number(p.amountPaid);
                    return (
                      <Fragment key={p.id}>
                        <tr className="hover:bg-slate-50/70">
                          <td className="td font-medium text-ink-900">{p.tenant.fullName}</td>
                          <td className="td">{p.lease.room.name}</td>
                          <td className="td tabular-nums">
                            {p.periodMonth}/{p.periodYear}
                          </td>
                          <td className="td tabular-nums">{money(p.totalAmount)}</td>
                          <td className="td tabular-nums">{money(p.amountPaid)}</td>
                          <td className="td">{date(p.dueDate)}</td>
                          <td className="td">
                            {p.daysLate > 0 ? (
                              <span className="font-medium text-rose-600">{p.daysLate}d</span>
                            ) : (
                              <span className="text-ink-400">-</span>
                            )}
                          </td>
                          <td className="td">
                            <Badge>{p.status}</Badge>
                          </td>
                          <td className="td text-right">
                            {!['PAID', 'WAIVED'].includes(p.status) && (
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => setRecordFor(recordFor === p.id ? null : p.id)}
                              >
                                {recordFor === p.id ? 'Close' : 'Record'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {recordFor === p.id && (
                          <tr>
                            <td colSpan={9} className="bg-slate-50 px-3 py-4">
                              <RecordForm
                                outstanding={outstanding}
                                onSubmit={(amount, method) => record.mutate({ id: p.id, amount, method })}
                                pending={record.isPending}
                              />
                              {record.error && (
                                <div className="mt-2">
                                  <ErrorBanner message={apiErrorMessage(record.error)} />
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function RecordForm({
  outstanding,
  onSubmit,
  pending,
}: {
  outstanding: number;
  onSubmit: (a: number, m: string) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState(outstanding);
  const [method, setMethod] = useState('CASH');
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(amount, method);
      }}
    >
      <Field label="Amount" className="w-40">
        <NumberInput value={amount} onChange={setAmount} min={0} />
      </Field>
      <Field label="Method" className="w-44">
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          {['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <button className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save payment'}
      </button>
    </form>
  );
}
