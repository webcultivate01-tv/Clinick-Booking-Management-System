import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import Loader from '../../components/common/Loader';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [form, setForm] = useState({ patient_name: '', email: '', rating: 5, review_text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/reviews/public')
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.patient_name.trim() || !form.review_text.trim()) {
      toast.error('Please fill in your name and review');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', form);
      toast.success("Thank you! Your review will appear after admin approval.");
      setForm({ patient_name: '', email: '', rating: 5, review_text: '' });
    } catch (err) {
      toast.error(err.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-cream py-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="section-tag">Reviews</span>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-charcoal mt-3">
            What our <span className="text-gold">patients say</span>
          </h1>
        </div>

        {loading && <Loader />}

        {!loading && (
          reviews.length === 0 ? (
            <p className="text-center text-muted py-10">Be the first to leave a review.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {reviews.map((r) => (
                <article key={r.id} className="bg-white rounded-2xl p-5 border border-gold-light/60 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading text-brown">{r.patient_name}</h3>
                    <span className="text-gold">
                      {Array.from({ length: r.rating }).map((_, i) => (<i key={i} className="fa-solid fa-star text-xs"></i>))}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal/80 leading-relaxed">{r.review_text}</p>
                </article>
              ))}
            </div>
          )
        )}

        <form onSubmit={submit} className="bg-white rounded-3xl border border-gold-light shadow-soft p-6 sm:p-8 mt-12">
          <h2 className="font-heading text-2xl text-brown mb-4">Share your experience</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">Your name<span className="text-rose-500"> *</span></label>
              <input className="input-base" value={form.patient_name}
                     onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
            </div>
            <div>
              <label className="label-base">Email (optional)</label>
              <input type="email" className="input-base" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <label className="label-base">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })}
                        className="text-2xl text-gold focus:outline-none">
                  <i className={`${form.rating >= n ? 'fa-solid' : 'fa-regular'} fa-star`}></i>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="label-base">Your review<span className="text-rose-500"> *</span></label>
            <textarea rows={4} className="input-base" value={form.review_text}
                      onChange={(e) => setForm({ ...form, review_text: e.target.value })} />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-5">
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </section>
  );
}
