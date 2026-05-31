import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';

const MOBILE_RE = /^[6-9]\d{9}$/;

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Valid email required';
    if (form.mobile && !MOBILE_RE.test(form.mobile)) er.mobile = '10-digit mobile starting with 6–9';
    if (!form.message.trim() || form.message.length < 5) er.message = 'Please write a short message';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    try {
      await api.post('/enquiries', form);
      toast.success("Thanks! We'll get back to you within one business day.");
      setForm({ name: '', email: '', mobile: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'Could not send your message');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-cream py-16">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <span className="section-tag">Contact</span>
          <h1 className="font-heading text-4xl font-bold text-charcoal mt-3 mb-3">
            Talk to <span className="text-gold">our team</span>
          </h1>
          <p className="text-muted mb-6 leading-relaxed">
            Send us a quick message or call us directly. For urgent concerns please call the clinic.
          </p>

          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-phone text-gold mt-1"></i>
              <a href="tel:+919876543210" className="text-charcoal/90 hover:text-gold">+91 98765 43210</a>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-envelope text-gold mt-1"></i>
              <a href="mailto:hello@lumiereskin.com" className="text-charcoal/90 hover:text-gold">hello@lumiereskin.com</a>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-location-dot text-gold mt-1"></i>
              <span className="text-charcoal/90">123, Skin Street, Near City Hospital, Nashik, Maharashtra — 422001</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-regular fa-clock text-gold mt-1"></i>
              <span className="text-charcoal/90">Mon–Sat: 9 AM – 7 PM<br /><span className="text-gold">Sun: Emergency Only</span></span>
            </li>
          </ul>
        </div>

        <form onSubmit={submit} className="bg-white rounded-3xl border border-gold-light shadow-soft p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">Name<span className="text-rose-500"> *</span></label>
              <input className="input-base" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label-base">Email<span className="text-rose-500"> *</span></label>
              <input type="email" className="input-base" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label-base">Mobile</label>
              <input className="input-base" maxLength={10} value={form.mobile}
                     onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
              {errors.mobile && <p className="text-rose-600 text-xs mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <label className="label-base">Subject</label>
              <input className="input-base" value={form.subject}
                     onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <label className="label-base">Message<span className="text-rose-500"> *</span></label>
            <textarea rows={4} className="input-base" value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })} />
            {errors.message && <p className="text-rose-600 text-xs mt-1">{errors.message}</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-5">
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
}
