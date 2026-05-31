import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import { formatINR } from '../../utils/formatters';

/**
 * Cancel-with-refund modal.
 *
 * Refund policy default: 80% refunded, 20% cancellation fee. Admin can edit
 * the percentage in case of clinic error (then they'd typically refund 100%).
 *
 *   - Online + paid  → calls Razorpay refund and marks payment 'refunded'.
 *   - Cash + paid    → no refund pushed; modal surfaces the cash amount to
 *                      hand back at the counter.
 *   - Pending        → just cancels; nothing to refund.
 */
export default function CancelAppointmentModal({ appointment, open, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(true);
  const [percent, setPercent] = useState(80);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setPercent(80);
    // Only default to refund when there's actually money to give back.
    setRefund(appointment?.payment_status === 'paid');
  }, [open, appointment]);

  if (!open || !appointment) return null;

  const amount = Number(appointment.amount) || 0;
  const refundAmount = Math.round((amount * percent) / 100);
  const feeAmount = amount - refundAmount;
  const isPaid = appointment.payment_status === 'paid';
  const isCash = appointment.payment_mode === 'cash';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const t = toast.loading('Cancelling…');
    try {
      const res = await api.post(`/appointments/${appointment.id}/cancel`, {
        refund: isPaid ? refund : false,
        refund_percent: isPaid && refund ? percent : undefined,
        reason: reason || undefined,
      });
      toast.dismiss(t);
      toast.success(res.message || 'Cancelled');
      onDone?.(res.data);
      onClose();
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || 'Could not cancel');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1a1f36]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="dash-card w-full max-w-lg my-8"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '24px' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1f2230]">
              Cancel appointment #{appointment.queue_number}
            </h3>
            <p className="text-sm text-[#6b7385]">
              {appointment.patient_name} · {appointment.service_title} · {formatINR(amount)}
            </p>
          </div>
          <button type="button" className="dbtn dbtn-secondary" onClick={onClose}
            style={{ padding: '6px 10px' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-[#6b7385] block mb-1">Reason (saved to internal notes)</label>
            <input
              type="text"
              className="dash-input"
              maxLength={255}
              placeholder="Eg. Patient request, doctor unavailable…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {!isPaid && (
            <div className="rounded-xl border border-dash-line bg-[#f8f6f1] p-3 text-sm text-[#6b7385]">
              <i className="fa-regular fa-circle-info mr-1"></i>
              Payment isn't captured yet — nothing to refund. The booking will simply be cancelled.
            </div>
          )}

          {isPaid && (
            <>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-dash-line cursor-pointer hover:bg-[#f6f7fb]">
                <input
                  type="checkbox"
                  checked={refund}
                  onChange={(e) => setRefund(e.target.checked)}
                  className="mt-1"
                />
                <div className="text-sm">
                  <div className="font-semibold text-[#1f2230]">
                    Issue refund{isCash ? ' (cash at counter)' : ' via Razorpay'}
                  </div>
                  <div className="text-[#6b7385] text-xs mt-0.5">
                    Default policy: 80% refunded, 20% cancellation fee. Adjust if needed.
                  </div>
                </div>
              </label>

              {refund && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#6b7385] flex items-center justify-between mb-1">
                      <span>Refund percentage</span>
                      <span className="font-semibold text-[#1f2230]">{percent}%</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={percent}
                      onChange={(e) => setPercent(Number(e.target.value))}
                      className="w-full accent-[#5c3d2e]"
                    />
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {[50, 80, 100].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPercent(p)}
                          className={`dbtn ${percent === p ? 'dbtn-primary' : 'dbtn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dash-line bg-white p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6b7385]">Original amount</span>
                      <span className="font-semibold text-[#1f2230]">{formatINR(amount)}</span>
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[#6b7385]">Cancellation fee ({100 - percent}%)</span>
                      <span className="font-semibold text-rose-600">− {formatINR(feeAmount)}</span>
                    </div>
                    <div className="border-t border-dash-line mt-2 pt-2 flex justify-between">
                      <span className="text-[#1f2230] font-semibold">
                        {isCash ? 'Return cash to patient' : 'Refund to Razorpay'}
                      </span>
                      <span className="font-bold text-emerald-700">{formatINR(refundAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-dash-line">
            <button type="button" className="dbtn dbtn-secondary" onClick={onClose} disabled={busy}>
              Keep appointment
            </button>
            <button type="submit" className="dbtn dbtn-danger" disabled={busy}>
              {busy ? 'Cancelling…' : isPaid && refund
                ? `Cancel & refund ${formatINR(refundAmount)}`
                : 'Cancel appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
