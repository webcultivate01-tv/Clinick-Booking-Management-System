import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import Loader from '../../components/common/Loader';

export default function StaffManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', password: '' });
  const [openForm, setOpenForm] = useState(false);

  function load() {
    setLoading(true);
    api.get('/admin/staff')
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load staff'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function createStaff(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/staff', form);
      toast.success('Staff created');
      setForm({ full_name: '', email: '', mobile: '', password: '' });
      setOpenForm(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not create staff');
    } finally { setBusy(false); }
  }

  async function removeStaff(id) {
    if (!confirm('Remove this staff member?')) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success('Removed');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  }

  return (
    <>
      <PageHeader title="Staff" subtitle={`${rows.length} member${rows.length === 1 ? '' : 's'}`}>
        <button className="dbtn dbtn-primary" onClick={() => setOpenForm((v) => !v)}>
          <i className="fa-solid fa-plus"></i> Add staff
        </button>
      </PageHeader>

      {openForm && (
        <form onSubmit={createStaff} className="dash-card mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="dash-input" placeholder="Full name *"
                 value={form.full_name} required minLength={2}
                 onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="dash-input" type="email" placeholder="Email *"
                 value={form.email} required
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="dash-input" placeholder="Mobile (10 digits)" maxLength={10}
                 value={form.mobile}
                 onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
          <input className="dash-input" type="password" placeholder="Password (min 8) *"
                 value={form.password} required minLength={8}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="dbtn dbtn-secondary" onClick={() => setOpenForm(false)}>Cancel</button>
            <button type="submit" className="dbtn dbtn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create staff'}
            </button>
          </div>
        </form>
      )}

      {loading && <Loader />}
      {!loading && rows.length === 0 && !openForm && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-user"></i>No staff yet.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="dash-card p-0 overflow-hidden">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Mobile</th><th>Active</th><th>Created</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-[#1f2230]">{u.full_name}</td>
                  <td className="text-[#4b5063]">{u.email}</td>
                  <td className="text-[#4b5063]">{u.mobile || '—'}</td>
                  <td>{u.is_active ? <span className="badge badge-confirmed">Active</span> : <span className="badge badge-cancelled">Disabled</span>}</td>
                  <td className="text-[#6b7385] text-xs">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="text-right">
                    <button className="dbtn dbtn-danger" onClick={() => removeStaff(u.id)}>
                      <i className="fa-regular fa-trash-can"></i> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
