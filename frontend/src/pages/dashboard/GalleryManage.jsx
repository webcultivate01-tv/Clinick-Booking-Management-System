import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { api } from '../../api/axios';
import { selectUser } from '../../store/authSlice';
import PageHeader from '../../components/dashboard/PageHeader';
import Loader from '../../components/common/Loader';

const SOURCES = [
  { value: 'file', label: 'From computer', icon: 'fa-upload' },
  { value: 'url',  label: 'From URL',      icon: 'fa-link' },
];

export default function GalleryManage() {
  const user = useSelector(selectUser);
  const canDelete = user?.role === 'admin';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [source, setSource] = useState('file');
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [mirror, setMirror] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');

  function load() {
    setLoading(true);
    api.get('/gallery')
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load gallery'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setFile(null);
    setImageUrl('');
    setTitle('');
    setCategory('');
    setMirror(true);
  }

  async function upload(e) {
    e.preventDefault();
    if (source === 'file' && !file) { toast.error('Pick an image first'); return; }
    if (source === 'url' && !imageUrl.trim()) { toast.error('Paste an image URL'); return; }

    setBusy(true);
    try {
      if (source === 'file') {
        const fd = new FormData();
        fd.append('image', file);
        if (title) fd.append('title', title);
        if (category) fd.append('category', category);
        const res = await api.post('/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(res.message || 'Uploaded');
      } else {
        const res = await api.post('/gallery', {
          image_url: imageUrl.trim(),
          mirror,
          title: title || undefined,
          category: category || undefined,
        });
        toast.success(res.message || 'Added');
      }
      resetForm();
      // Reset the actual file input element too.
      const input = e.target.querySelector('input[type=file]');
      if (input) input.value = '';
      load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setBusy(false); }
  }

  async function toggle(item) {
    try {
      const res = await api.patch(`/gallery/${item.id}`, { is_active: !item.is_active });
      setRows((r) => r.map((x) => (x.id === item.id ? { ...x, ...res.data } : x)));
    } catch (err) { toast.error(err.message || 'Update failed'); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this image? The file will be removed from the server.')) return;
    try {
      await api.delete(`/gallery/${id}`);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  }

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : null;
  const willCompress = file && file.size > 1024 * 1024;

  return (
    <>
      <PageHeader title="Gallery" subtitle={`${rows.length} image${rows.length === 1 ? '' : 's'}`} />

      <form onSubmit={upload} className="dash-card mb-5 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6b7385] mb-2 block">Source</label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                className={`dbtn ${source === s.value ? 'dbtn-primary' : 'dbtn-secondary'}`}
              >
                <i className={`fa-solid ${s.icon}`}></i>
                <span className="ml-1">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {source === 'file' && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b7385] mb-1 block">
              Pick an image *
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/tiff"
              className="dash-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-[#6b7385] mt-1.5">
                <i className="fa-solid fa-file-image mr-1"></i>
                {file.name} · {fileSizeMB} MB
                {willCompress && (
                  <span className="ml-2 text-amber-700 font-semibold">
                    <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                    will be compressed to WebP
                  </span>
                )}
              </p>
            )}
            <p className="text-xs text-[#9aa3b2] mt-1">
              JPG/PNG/WebP/GIF · max 20 MB · files over 1 MB are auto-converted to WebP (max 1920 px).
            </p>
          </div>
        )}

        {source === 'url' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b7385] mb-1 block">
              Image URL *
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              className="dash-input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <label className="flex items-start gap-2 text-sm text-[#2d3142] cursor-pointer">
              <input
                type="checkbox"
                checked={mirror}
                onChange={(e) => setMirror(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Save a copy on our server</span>
                <span className="block text-xs text-[#6b7385]">
                  Recommended — the image stays available even if the source URL breaks. Will be compressed to WebP if &gt; 1 MB.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6b7385] block mb-1">Title (optional)</label>
            <input className="dash-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[#6b7385] block mb-1">Category (optional)</label>
            <input className="dash-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Eg. Before-after, Clinic, Team" />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-dash-line">
          <button type="submit" className="dbtn dbtn-primary" disabled={busy}>
            <i className="fa-solid fa-floppy-disk"></i>
            <span className="ml-1">{busy ? 'Saving…' : 'Add to gallery'}</span>
          </button>
        </div>
      </form>

      {loading && <Loader />}
      {!loading && rows.length === 0 && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-images"></i>Gallery is empty. Upload your first image above.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((g) => (
            <div key={g.id} className="dash-card p-0 overflow-hidden">
              <img
                src={g.image_url}
                alt={g.title || ''}
                loading="lazy"
                className="w-full h-44 object-cover bg-[#f4f5f9]"
              />
              <div className="p-3">
                <div className="font-medium text-[#1f2230] text-sm truncate">{g.title || 'Untitled'}</div>
                {g.category && <div className="text-xs text-[#8a92a6]">{g.category}</div>}
                {!g.image_public_id && (
                  <div className="text-[10px] text-[#aab0bd] mt-0.5">
                    <i className="fa-solid fa-link mr-1"></i>linked
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button
                    className="text-xs font-semibold"
                    style={{ color: g.is_active ? '#1e7a3a' : '#b42323' }}
                    onClick={() => toggle(g)}
                  >
                    {g.is_active ? 'Active' : 'Hidden'}
                  </button>
                  {canDelete && (
                    <button className="dbtn dbtn-danger" onClick={() => remove(g.id)}>
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
