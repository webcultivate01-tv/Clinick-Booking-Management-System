import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/axios';
import { formatDateLong, formatTime12, formatINR } from '../../utils/formatters';
import Loader from '../../components/common/Loader';

/**
 * Shows up after a successful payment. We try to read the appointment from
 * router state first (set by Appointment.jsx so we don't need a round-trip);
 * if it's not there (e.g. the user reloaded), we fetch by id — but that
 * endpoint requires auth, so guests reloading this page get a friendly
 * fallback instead of an error.
 */
export default function BookingConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const [appointment, setAppointment] = useState(state?.appointment || null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (appointment) return;
    api.get(`/appointments/${id}`)
      .then((res) => setAppointment(res.data))
      .catch(() => setMissing(true));
  }, [id, appointment]);

  if (!appointment && !missing) return <Loader label="Loading your booking…" />;

  if (missing) {
    return (
      <section className="bg-cream min-h-[60vh] flex items-center justify-center px-6 py-16">
        <div className="bg-white rounded-3xl border border-gold-light shadow-soft p-8 text-center max-w-md">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <i className="fa-solid fa-check text-emerald-600 text-2xl"></i>
          </div>
          <h2 className="font-heading text-2xl text-brown mb-2">Booking confirmed</h2>
          <p className="text-sm text-muted mb-6">
            Your appointment is confirmed. We've sent the details to your email — please check
            your inbox (and spam folder) for the queue number and time.
          </p>
          <Link to="/" className="btn-outline">Back to home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-cream min-h-screen py-12 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <i className="fa-solid fa-check text-emerald-600 text-3xl"></i>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-charcoal mb-2">
            Booking <span className="text-gold">confirmed</span>
          </h1>
          <p className="text-muted text-sm">A confirmation email has been sent to <strong>{appointment.patient_email}</strong>.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gold-light shadow-soft p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gold-light/60">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted mb-1">Your queue number</div>
              <div className="font-heading text-5xl font-bold text-brown leading-none">
                #{appointment.queue_number}
              </div>
              <div className="text-xs text-muted mt-1">First-booked-first basis</div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="badge badge-paid">PAID · {formatINR(appointment.amount)}</span>
              <span className="badge badge-confirmed">{(appointment.appointment_status || 'confirmed').toUpperCase()}</span>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-5 text-sm">
            <Row label="Patient" value={appointment.patient_name} />
            <Row label="Mobile"  value={appointment.patient_mobile} />
            <Row label="Service" value={appointment.service_title} />
            <Row label="Duration" value={`${appointment.service_duration} min`} />
            <Row label="Date"    value={formatDateLong(appointment.appointment_date)} />
            <Row label="Time"    value={formatTime12(appointment.appointment_time)} />
          </dl>

          <div className="mt-6 pt-5 border-t border-gold-light/60 flex flex-col sm:flex-row gap-3">
            <Link to="/" className="btn-outline flex-1 text-center">Back to home</Link>
            <Link to="/contact" className="btn-primary flex-1 text-center">
              <i className="fa-solid fa-phone mr-2"></i> Contact clinic
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-5">
          Please arrive 10 minutes before your scheduled time. To reschedule, contact us at least 24 hours in advance.
        </p>
      </div>
    </section>
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
