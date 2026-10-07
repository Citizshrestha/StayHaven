import { useCallback, useEffect, useState } from 'react';
import { getPendingBankTransfers, approveBankTransfer, rejectBankTransfer } from '../../../../core/api/services/reception.service';

const money = value => `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankTransferReview({ onSettled }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingBankTransfers();
      setItems(result.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load bank transfers.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const choose = (item, action) => {
    setSelected({ item, action });
    setReference(''); setReason(''); setError('');
  };

  const submit = async () => {
    if (!selected || busy) return;
    const { item, action } = selected;
    if (action === 'approve' && reference.trim().toUpperCase() !== item.reference?.trim().toUpperCase()) {
      setError('Enter the transfer reference exactly as it appears on the bank statement.'); return;
    }
    if (action === 'reject' && !reason.trim()) { setError('Add a reason for the guest and audit record.'); return; }
    setBusy(true); setError('');
    try {
      if (action === 'approve') await approveBankTransfer(item._id, 'Verified against bank statement');
      else await rejectBankTransfer(item._id, reason.trim());
      setSelected(null);
      await refresh();
      onSettled?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update this transfer. Refresh and check its status.');
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6" aria-label="Bank transfer review">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bank transfers awaiting verification</h2>
          <p className="text-sm text-slate-600">Compare each transfer with the hotel bank statement before approving it. Guests stay unpaid until approval.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Refresh</button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading transfers…</p> : items.length === 0 ?
        <p className="text-sm text-slate-500">No bank transfers are waiting for review.</p> :
        <div className="space-y-3">
          {items.map(item => <div key={item._id} className="rounded-xl border border-slate-200 p-4 sm:flex sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{item.order?.orderNumber ? `Order ${item.order.orderNumber}` : item.invoice?.invoiceId ? `Invoice ${item.invoice.invoiceId}` : item.booking?.bookingId ? `Booking ${item.booking.bookingId}` : 'Payment'}</p>
              <p className="text-sm text-slate-600">{money(item.amount)} · Ref: <span className="font-mono break-all">{item.reference || 'Missing'}</span></p>
              <p className="text-xs text-slate-500">Submitted {new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <button type="button" onClick={() => choose(item, 'approve')} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Review to approve</button>
              <button type="button" onClick={() => choose(item, 'reject')} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Reject</button>
            </div>
          </div>)}
        </div>}
      {selected && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h3 className="font-semibold text-slate-900">{selected.action === 'approve' ? 'Verify receipt before approval' : 'Reject transfer'} · {money(selected.item.amount)}</h3>
        {selected.action === 'approve' ? <>
          <p className="mt-1 text-sm text-slate-700">Check the bank statement for the exact amount and reference. Approval marks the guest’s bill paid.</p>
          <label className="mt-3 block text-sm font-medium text-slate-800">Reference shown on bank statement
            <input value={reference} onChange={e => setReference(e.target.value)} autoComplete="off" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2" />
          </label>
        </> : <label className="mt-3 block text-sm font-medium text-slate-800">Reason for rejection
          <input value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2" />
        </label>}
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={submit} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : selected.action === 'approve' ? 'Confirm verified transfer' : 'Confirm rejection'}</button>
          <button type="button" onClick={() => setSelected(null)} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
        </div>
      </div>}
    </section>
  );
}
