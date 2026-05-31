/**
 * Step 1 — Patient details. All fields validated synchronously so the user
 * can't proceed with bad data; matches the zod schema on the backend.
 */
import { useState } from 'react';

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PatientDetailsStep({ form, set, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.full_name?.trim() || form.full_name.trim().length < 2) e.full_name = 'Full name is required';
    if (!EMAIL_RE.test(form.email || '')) e.email = 'Valid email is required';
    if (!MOBILE_RE.test(form.mobile || '')) e.mobile = '10-digit Indian mobile (starts with 6–9)';
    if (!form.dob) e.dob = 'Date of birth helps us send you birthday wishes 🎂';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="label-base">Full name<span className="text-rose-500"> *</span></label>
        <input
          className="input-base"
          placeholder="e.g. Riya Sharma"
          value={form.full_name || ''}
          onChange={(e) => set({ full_name: e.target.value })}
        />
        {errors.full_name && <p className="text-rose-600 text-xs mt-1">{errors.full_name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Mobile<span className="text-rose-500"> *</span></label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            className="input-base"
            placeholder="9876543210"
            value={form.mobile || ''}
            onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, '') })}
          />
          {errors.mobile && <p className="text-rose-600 text-xs mt-1">{errors.mobile}</p>}
        </div>
        <div>
          <label className="label-base">Email<span className="text-rose-500"> *</span></label>
          <input
            type="email"
            className="input-base"
            placeholder="you@example.com"
            value={form.email || ''}
            onChange={(e) => set({ email: e.target.value })}
          />
          {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Date of birth<span className="text-rose-500"> *</span></label>
          <input
            type="date"
            className="input-base"
            max={new Date().toISOString().slice(0, 10)}
            value={form.dob || ''}
            onChange={(e) => set({ dob: e.target.value })}
          />
          {errors.dob && <p className="text-rose-600 text-xs mt-1">{errors.dob}</p>}
        </div>
        <div>
          <label className="label-base">Gender</label>
          <select
            className="input-base"
            value={form.gender || ''}
            onChange={(e) => set({ gender: e.target.value || undefined })}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" className="btn-primary" onClick={() => validate() && onNext()}>
          Continue <i className="fa-solid fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
}
