import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { api } from '../../api/axios';
import { selectUser } from '../../store/authSlice';
import PageHeader from '../../components/dashboard/PageHeader';
import Loader from '../../components/common/Loader';

/**
 * Admin user management — admin only. Backend prevents deletion of:
 *   - yourself
 *   - the last remaining active admin
 * Those constraints surface as toast errors here, no client-side gating needed.
 */
export default function AdminManage() {
  const me = useSelector(selectUser);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', password: '' });

  function load() {
    setLoading(true);
    api.get('/admin/admins')
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load admins'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function createAdmin(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/admins', form);
      toast.success('Admin created');
      setForm({ full_name: '', email: '', mobile: '', password: '' });
      setOpenForm(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not create admin');
    } finally { setBusy(false); }
  }

  async function removeAdmin(id) {
    if (!window.confirm('Remove this admin account? They will lose access immediately.')) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success('Admin removed');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  }

  return (
    <>
      <PageHeader title="Admins" subtitle={`${rows.length} admin account${rows.length === 1 ? '' : 's'}`}>
        <button className="dbtn dbtn-primary" onClick={() => setOpenForm((v) => !v)}>
          <i className="fa-solid fa-plus"></i> Add admin
        </button>
      </PageHeader>

      {openForm && (
        <form onSubmit={createAdmin} className="dash-card mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="dash-input" placeholder="Full name *" required minLength={2}
                 value={form.full_name}
                 onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="dash-input" type="email" placeholder="Email *" required
                 value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="dash-input" placeholder="Mobile (10 digits)" maxLength={10}
                 value={form.mobile}
                 onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
          <input className="dash-input" type="password" placeholder="Password (min 8) *" required minLength={8}
                 value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="dbtn dbtn-secondary" onClick={() => setOpenForm(false)}>Cancel</button>
            <button type="submit" className="dbtn dbtn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create admin'}
            </button>
          </div>
        </form>
      )}

      {loading && <Loader />}
      {!loading && rows.length === 0 && !openForm && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-user"></i>No admins yet.
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
              {rows.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="font-semibold text-[#1f2230]">
                        {u.full_name}
                        {isMe && <span className="badge badge-blue ml-2">You</span>}
                      </div>
                    </td>
                    <td className="text-[#4b5063]">{u.email}</td>
                    <td className="text-[#4b5063]">{u.mobile || '—'}</td>
                    <td>
                      {u.is_active
                        ? <span className="badge badge-confirmed">Active</span>
                        : <span className="badge badge-cancelled">Disabled</span>}
                    </td>
                    <td className="text-[#6b7385] text-xs">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="text-right">
                      <button
                        className="dbtn dbtn-danger"
                        disabled={isMe}
                        title={isMe ? "You can't delete your own account" : ''}
                        onClick={() => removeAdmin(u.id)}
                      >
                        <i className="fa-regular fa-trash-can"></i> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
