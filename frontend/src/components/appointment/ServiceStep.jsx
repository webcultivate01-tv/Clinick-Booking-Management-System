import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { formatINR } from '../../utils/formatters';
import Loader from '../common/Loader';

export default function ServiceStep({ form, set, onNext, onBack }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/services', { params: { active: 'true' } })
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading services…" />;

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-rose-600 text-sm mb-3">{error}</p>
        <button className="btn-outline" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="text-center py-10 text-muted text-sm">
        No services available right now. Please call us to book.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {services.map((s) => {
          const selected = Number(form.service_id) === s.id;
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => set({ service_id: s.id, _service: s })}
              className={`text-left p-4 rounded-2xl border-2 transition-all bg-white ${
                selected ? 'border-gold shadow-card' : 'border-gold-light/60 hover:border-gold/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-heading text-base font-semibold text-brown leading-tight">{s.title}</h3>
                <span className="text-gold font-semibold text-sm whitespace-nowrap">{formatINR(s.price)}</span>
              </div>
              {s.short_description && (
                <p className="text-xs text-muted leading-relaxed">{s.short_description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted mt-3">
                <span><i className="fa-regular fa-clock mr-1 text-gold"></i> {s.duration_minutes} min</span>
                {selected && (
                  <span className="ml-auto text-emerald-600 font-semibold">
                    <i className="fa-solid fa-check-circle mr-1"></i> Selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button className="btn-outline" onClick={onBack}>
          <i className="fa-solid fa-arrow-left mr-2"></i> Back
        </button>
        <button
          className="btn-primary"
          disabled={!form.service_id}
          onClick={onNext}
        >
          Continue <i className="fa-solid fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
}
