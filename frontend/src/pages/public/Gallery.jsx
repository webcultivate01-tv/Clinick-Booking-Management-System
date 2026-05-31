import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import Loader from '../../components/common/Loader';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gallery', { params: { active: 'true' } })
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-cream py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="section-tag">Gallery</span>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-charcoal mt-3">
            Inside <span className="text-gold">our clinic</span>
          </h1>
        </div>

        {loading && <Loader />}

        {!loading && items.length === 0 && (
          <p className="text-center text-muted py-10">Gallery is being curated. Please check back soon.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((g) => (
              <a key={g.id} href={g.image_url} target="_blank" rel="noreferrer"
                 className="block rounded-xl overflow-hidden shadow-soft hover:shadow-card transition-shadow">
                <img src={g.image_url} alt={g.title || ''} loading="lazy"
                     className="w-full h-40 sm:h-48 object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
