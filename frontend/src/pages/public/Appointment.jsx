import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Stepper from '../../components/appointment/Stepper';
import PatientDetailsStep from '../../components/appointment/PatientDetailsStep';
import ServiceStep from '../../components/appointment/ServiceStep';
import SlotStep from '../../components/appointment/SlotStep';
import ReviewStep from '../../components/appointment/ReviewStep';
import { api } from '../../api/axios';

const STEP_ORDER = ['details', 'service', 'slot', 'review', 'payment'];

export default function Appointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState('details');
  const [form, _setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setForm = useCallback((patch) => _setForm((prev) => ({ ...prev, ...patch })), []);
  const goto = (key) => { setStep(key); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const next = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i < STEP_ORDER.length - 1) goto(STEP_ORDER[i + 1]);
  };
  const back = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) goto(STEP_ORDER[i - 1]);
  };

  /**
   * Opens Razorpay checkout. The script is loaded from index.html so
   * window.Razorpay is available globally.
   */
  const openRazorpay = (order, appointment, patient) =>
    new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK failed to load. Check your internet connection.'));
        return;
      }
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Lumière Skin Clinic',
        description: form._service?.title || 'Appointment booking',
        order_id: order.id,
        prefill: {
          name: patient.full_name,
          email: patient.email,
          contact: patient.mobile,
        },
        theme: { color: '#5c3d2e' },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
        handler: (response) => resolve({ response, appointment }),
      });
      rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed')));
      rzp.open();
    });

  const handlePay = useCallback(async () => {
    setSubmitting(true);
    const t = toast.loading('Creating your booking…');

    try {
      // 1. Create the order on the server (also creates the pending appointment).
      const payload = {
        full_name: form.full_name,
        email: form.email,
        mobile: form.mobile,
        gender: form.gender,
        dob: form.dob,
        service_id: form.service_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        problem_description: form.problem_description || '',
        terms_accepted: Boolean(form.terms_accepted),
      };
      const { data } = await api.post('/appointments/create-order', payload);

      toast.dismiss(t);

      // 2. Open Razorpay checkout.
      const { response } = await openRazorpay(data.order, data.appointment, data.patient);

      // 3. Verify the signature on the server.
      const verifyToast = toast.loading('Verifying payment…');
      const { data: verified } = await api.post('/appointments/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      toast.dismiss(verifyToast);
      toast.success('Appointment confirmed! Check your email for details.');

      // 4. Go to confirmation page.
      navigate(`/appointment/confirmation/${verified.appointment.id}`, {
        state: { appointment: verified.appointment },
        replace: true,
      });
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, navigate]);

  return (
    <section className="bg-cream min-h-screen py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="text-center mb-6">
          <span className="section-tag">Book Appointment</span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-charcoal mt-2 mb-2">
            Reserve your <span className="text-gold">consultation</span>
          </h1>
          <p className="text-muted text-sm sm:text-base">
            Five quick steps. Pay securely with Razorpay. Receive instant confirmation via email.
          </p>
        </header>

        <div className="bg-white rounded-3xl border border-gold-light shadow-soft p-4 sm:p-8">
          <Stepper current={step === 'payment' ? 'payment' : step} />

          <div className="mt-6">
            {step === 'details' && (
              <PatientDetailsStep form={form} set={setForm} onNext={next} />
            )}
            {step === 'service' && (
              <ServiceStep form={form} set={setForm} onNext={next} onBack={back} />
            )}
            {step === 'slot' && (
              <SlotStep form={form} set={setForm} onNext={next} onBack={back} />
            )}
            {step === 'review' && (
              <ReviewStep
                form={{ ...form, setForm }}
                onNext={() => { goto('payment'); handlePay(); }}
                onBack={back}
              />
            )}
            {step === 'payment' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-gold-light flex items-center justify-center mb-4">
                  <i className={`fa-solid ${submitting ? 'fa-lock' : 'fa-check'} text-gold text-2xl ${submitting ? 'animate-pulse' : ''}`}></i>
                </div>
                <h3 className="font-heading text-xl text-brown mb-2">
                  {submitting ? 'Opening secure checkout…' : 'Almost there!'}
                </h3>
                <p className="text-sm text-muted mb-6">
                  {submitting
                    ? 'Please complete payment in the Razorpay window.'
                    : 'If the payment window did not open, you can retry.'}
                </p>
                {!submitting && (
                  <button className="btn-primary" onClick={handlePay}>
                    Retry payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <i className="fa-solid fa-lock text-gold mr-1"></i>
          Payments are processed securely via Razorpay. We never store your card details.
        </p>
      </div>
    </section>
  );
}
