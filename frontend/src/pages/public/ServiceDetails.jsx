import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/axios';
import { formatINR } from '../../utils/formatters';
import Loader from '../../components/common/Loader';

export default function ServiceDetails() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/services/${slug}`)
      .then((res) => setService(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader />;
  if (error)   return <div className="text-center py-20 text-rose-600 text-sm">{error}</div>;
  if (!service) return null;

  return (
    <section className="bg-cream py-16">
      <div className="max-w-3xl mx-auto px-6">
        <Link to="/services" className="text-sm text-gold font-medium">
          <i className="fa-solid fa-arrow-left mr-1"></i> Back to services
        </Link>
        <h1 className="font-heading text-4xl font-bold text-charcoal mt-4 mb-2">{service.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted mb-6">
          <span><i className="fa-regular fa-clock mr-1 text-gold"></i> {service.duration_minutes} min</span>
          <span className="font-semibold text-brown">{formatINR(service.price)}</span>
        </div>
        {service.image_url && (
          <img src={service.image_url} alt={service.title} className="rounded-2xl w-full mb-6 shadow-soft" />
        )}
        <p className="text-charcoal/85 leading-relaxed whitespace-pre-line">{service.description}</p>

        <div className="mt-8">
          <Link to="/appointment" className="btn-primary">
            <i className="fa-regular fa-calendar-check mr-2"></i> Book this treatment
          </Link>
        </div>
      </div>
    </section>
  );
}
