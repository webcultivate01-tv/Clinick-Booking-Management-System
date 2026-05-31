import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axios';
import { formatINR } from '../../utils/formatters';
import Loader from '../../components/common/Loader';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/services', { params: { active: 'true' } })
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="section-tag">Services & Treatments</span>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-charcoal mt-3 mb-3">
            Treatments that <span className="text-gold">deliver results</span>
          </h1>
          <p className="text-muted max-w-2xl mx-auto">
            Every service below is performed by certified specialists using clinically validated protocols.
          </p>
        </div>

        {loading && <Loader />}

        {error && !loading && (
          <div className="text-center py-10 text-rose-600 text-sm">{error}</div>
        )}

        {!loading && !error && !services.length && (
          <div className="text-center py-12 text-muted">No active services yet. Please check back soon.</div>
        )}

        {!loading && !error && services.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <article key={s.id} className="bg-white rounded-2xl p-6 border border-gold-light/60 card-hover flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-gold-light flex items-center justify-center mb-4">
                  <i className="fa-solid fa-spa text-gold text-lg"></i>
                </div>
                <h3 className="font-heading text-xl text-brown mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed mb-5 flex-1">
                  {s.short_description || s.description?.slice(0, 140) || ''}
                </p>
                <div className="flex items-center justify-between border-t border-gold-light/60 pt-4">
                  <div>
                    <div className="text-xs text-muted">Starting from</div>
                    <div className="text-lg font-semibold text-brown">{formatINR(s.price)}</div>
                  </div>
                  <Link to="/appointment" className="btn-outline" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                    Book
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
