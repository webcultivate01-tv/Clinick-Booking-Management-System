import { formatDateLong, formatTime12, formatINR } from '../../utils/formatters';

export default function ReviewStep({ form, onNext, onBack }) {
  const svc = form._service;
  const amount = svc?.price ?? 0;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gold-light p-5 sm:p-6 shadow-soft">
        <h3 className="font-heading text-lg font-semibold text-brown mb-4">Booking summary</h3>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <Row label="Name"     value={form.full_name} />
          <Row label="Mobile"   value={form.mobile} />
          <Row label="Email"    value={form.email} />
          <Row label="DOB"      value={form.dob ? formatDateLong(form.dob) : '—'} />
          <Row label="Service"  value={svc?.title || '—'} />
          <Row label="Duration" value={svc ? `${svc.duration_minutes} min` : '—'} />
          <Row label="Date"     value={form.appointment_date ? formatDateLong(form.appointment_date) : '—'} />
          <Row label="Time"     value={form.appointment_time ? formatTime12(form.appointment_time) : '—'} />
        </dl>

        {form.problem_description && (
          <div className="mt-4 pt-4 border-t border-gold-light/60">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Notes</div>
            <p className="text-sm text-charcoal leading-relaxed">{form.problem_description}</p>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gold-light/60 flex items-center justify-between">
          <div className="text-sm text-muted">Amount payable</div>
          <div className="font-heading text-2xl text-brown font-semibold">{formatINR(amount)}</div>
        </div>
      </div>

      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(form.terms_accepted)}
          onChange={(e) => form.setForm({ terms_accepted: e.target.checked })}
          className="mt-1 w-4 h-4 accent-gold"
        />
        <span className="text-sm text-muted leading-relaxed">
          I confirm the above details are correct and I accept the clinic's cancellation and rescheduling policy.
        </span>
      </label>

      <div className="flex justify-between pt-6">
        <button className="btn-outline" onClick={onBack}>
          <i className="fa-solid fa-arrow-left mr-2"></i> Back
        </button>
        <button
          className="btn-primary"
          disabled={!form.terms_accepted}
          onClick={onNext}
        >
          Proceed to payment <i className="fa-solid fa-lock ml-2"></i>
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-charcoal font-medium">{value || '—'}</dd>
    </div>
  );
}
