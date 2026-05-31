import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import PageHeader from '../../components/dashboard/PageHeader';

/**
 * Settings is intentionally light for now — profile info, role, and
 * environment summary. Editable profile + password change land in the
 * next pass once /api/auth/profile is added.
 */
export default function Settings() {
  const user = useSelector(selectUser);

  return (
    <>
      <PageHeader title="Settings" subtitle="Account &amp; clinic configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="dash-card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-[#1f2230] mb-4">
            <i className="fa-regular fa-user text-admin mr-2"></i> Your profile
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <Field label="Full name" value={user?.full_name} />
            <Field label="Email" value={user?.email} />
            <Field label="Role" value={user?.role?.toUpperCase()} />
            <Field label="Mobile" value={user?.mobile || '—'} />
            <Field label="Account status" value={user?.is_active ? 'Active' : 'Disabled'} />
            <Field label="User ID" value={user?.id} />
          </dl>
          <p className="text-xs text-[#9aa3b2] mt-6">
            Editable profile + password change ship in the next pass.
          </p>
        </section>

        <section className="dash-card p-6">
          <h3 className="text-base font-semibold text-[#1f2230] mb-4">
            <i className="fa-solid fa-circle-info text-admin mr-2"></i> System info
          </h3>
          <ul className="space-y-3 text-sm">
            <Info label="Clinic" value="Lumière Skin Clinic" />
            <Info label="Timezone" value="Asia/Kolkata (IST)" />
            <Info label="Frontend" value="React 18 · Vite · Tailwind" />
            <Info label="Backend" value="Node · Express · MySQL" />
            <Info label="Payments" value="Razorpay (test mode in dev)" />
            <Info label="Email" value="Nodemailer + birthday cron @ 09:00 IST" />
          </ul>
        </section>
      </div>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-widest text-[#6b7385] font-semibold mb-1">{label}</dt>
      <dd className="text-sm text-[#1f2230] font-medium">{value || '—'}</dd>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[#6b7385]">{label}</span>
      <span className="text-[#1f2230] font-medium">{value}</span>
    </li>
  );
}
