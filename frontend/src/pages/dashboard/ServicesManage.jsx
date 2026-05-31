import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import Loader from '../../components/common/Loader';
import { formatINR } from '../../utils/formatters';

const blank = {
  title: '', slug: '', short_description: '', description: '',
  price: 0, duration_minutes: 30, is_active: true,
};

export default function ServicesManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | service object
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.get('/services')
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load services'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing('new'); setForm(blank); setFile(null); }
  function openEdit(s) {
    setEditing(s);
    setForm({
      title: s.title, slug: s.slug,
      short_description: s.short_description || '',
      description: s.description || '',
      price: s.price, duration_minutes: s.duration_minutes,
      is_active: !!s.is_active,
    });
    setFile(null);
  }
  function cancel() { setEditing(null); setFile(null); }

  async function save(e) {
    e.preventDefault();
    setBusy(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('image', file);

    try {
      if (editing === 'new') {
        await api.post('/services', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Service created');
      } else {
        await api.patch(`/services/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Service updated');
      }
      cancel();
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success('Service deleted');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  }

  return (
    <>
      <PageHeader title="Services" subtitle={`${rows.length} service${rows.length === 1 ? '' : 's'}`}>
        {!editing && (
          <button className="dbtn dbtn-primary" onClick={openNew}>
            <i className="fa-solid fa-plus"></i> New service
          </button>
        )}
      </PageHeader>

      {editing && (
        <form onSubmit={save} className="dash-card mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="dash-input" placeholder="Title *" required
                 value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="dash-input" placeholder="slug-with-hyphens *" required
                 value={form.slug}
                 onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
          <input className="dash-input md:col-span-2" placeholder="Short description (max 280 chars)"
                 maxLength={280}
                 value={form.short_description}
                 onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          <textarea className="dash-input md:col-span-2" rows={4} placeholder="Full description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="dash-input" type="number" min={0} step={50} placeholder="Price (₹) *" required
                 value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input className="dash-input" type="number" min={1} placeholder="Duration (minutes) *" required
                 value={form.duration_minutes}
                 onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-[#4b5063]">
            <input type="checkbox" className="accent-admin"
                   checked={form.is_active}
                   onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (show on public site)
          </label>
          <input type="file" accept="image/*" className="dash-input"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="dbtn dbtn-secondary" onClick={cancel}>Cancel</button>
            <button type="submit" className="dbtn dbtn-primary" disabled={busy}>
              {busy ? 'Saving…' : (editing === 'new' ? 'Create' : 'Save changes')}
            </button>
          </div>
        </form>
      )}

      {loading && <Loader />}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => (
            <article key={s.id} className="dash-card">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />
              ) : (
                <div className="w-full h-32 rounded-xl bg-admin-soft flex items-center justify-center text-admin mb-3">
                  <i className="fa-solid fa-spa text-2xl"></i>
                </div>
              )}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-[#1f2230] leading-tight">{s.title}</h3>
                <span className="text-admin-deep font-semibold whitespace-nowrap">{formatINR(s.price)}</span>
              </div>
              <div className="text-xs text-[#8a92a6] mb-2">
                {s.duration_minutes} min · /{s.slug} ·{' '}
                {s.is_active ? <span className="text-emerald-600">active</span> : <span className="text-rose-500">inactive</span>}
              </div>
              {s.short_description && <p className="text-sm text-[#4b5063] line-clamp-2">{s.short_description}</p>}
              <div className="mt-3 flex gap-2">
                <button className="dbtn dbtn-secondary flex-1" onClick={() => openEdit(s)}>
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button className="dbtn dbtn-danger" onClick={() => remove(s.id)}>
                  <i className="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
