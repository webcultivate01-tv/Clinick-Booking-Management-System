import { Link } from 'react-router-dom';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=900&q=80',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=80',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80',
  'https://plus.unsplash.com/premium_photo-1683147871014-4f2ee5d3230e?w=900&q=80',
];

const STATS = [
  { num: '12+',     label: 'Years' },
  { num: '8000+',   label: 'Clients' },
  { num: '98%',     label: 'Satisfaction' },
  { num: '25+',     label: 'Treatments' },
];

const MARQUEE = [
  'Board-Certified Dermatologists',
  'FDA-Approved Treatments',
  'Personalised Care Plans',
  'Confidential & Safe',
  '12+ Years of Trust',
  'Modern Medical Equipment',
];

const WHY = [
  { icon: 'fa-user-doctor', img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80',
    title: 'Expert Dermatologists', body: 'Board-certified specialists with 10+ years of focused dermatology practice.' },
  { icon: 'fa-shield-halved', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80',
    title: 'Safe & Sterile Care', body: 'Hospital-grade protocols, FDA-cleared devices and single-use consumables.' },
  { icon: 'fa-microscope', img: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=600&q=80',
    title: 'Modern Technology', body: 'Latest fractional laser, HydraFacial and PRP systems for proven results.' },
  { icon: 'fa-heart', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    title: '8000+ Happy Patients', body: '4.9/5 rated across Google and Practo — see our reviews for yourself.' },
];

const TREATMENTS = [
  { icon: 'fa-droplet',    title: 'HydraFacial',         desc: 'Deep cleanse, exfoliate and hydrate in one 60-min session.' },
  { icon: 'fa-bolt',       title: 'Laser Resurfacing',   desc: 'Fractional CO₂ for scars, pigmentation and skin texture.' },
  { icon: 'fa-leaf',       title: 'Anti-Aging Therapy',  desc: 'Personalised plan for fine lines, wrinkles and elasticity.' },
  { icon: 'fa-spa',        title: 'Acne & Scar Care',    desc: 'Peels + microneedling + medical-grade topical regimen.' },
  { icon: 'fa-syringe',    title: 'Botox & Fillers',     desc: 'Subtle, natural-looking results from certified injectors.' },
  { icon: 'fa-vial',       title: 'PRP Therapy',         desc: 'Your own platelets to stimulate hair and skin renewal.' },
];

export default function Home() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative" style={{ background: 'linear-gradient(135deg, #faf7f2 0%, #f5ede6 100%)', padding: '100px 0 60px', overflow: 'hidden' }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center text-center md:text-left">
          <div className="relative z-10">
            <span className="section-tag">
              <i className="fa-solid fa-circle-dot mr-1"></i> Advanced Dermatology
            </span>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-charcoal leading-tight mt-1 mb-6">
              Reveal Your<br />
              <span className="text-gold font-heading">Radiant Skin</span>
            </h1>
            <p className="text-muted text-lg leading-relaxed mb-10 max-w-lg mx-auto md:mx-0">
              Where cutting-edge dermatology meets personalised luxury care. Our board-certified specialists craft custom
              skin plans that deliver real, lasting results — for every skin type, every tone.
            </p>
            <div className="flex flex-wrap gap-4 mb-12 justify-center md:justify-start">
              <Link to="/appointment" className="btn-primary">
                <i className="fa-regular fa-calendar-check mr-2"></i> Book Free Consultation
              </Link>
              <Link to="/services" className="btn-outline">
                <i className="fa-solid fa-arrow-right mr-2"></i> Our Services
              </Link>
            </div>

            <div className="flex items-center gap-6 justify-center md:justify-start flex-wrap">
              {STATS.map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brown">{s.num}</div>
                    <div className="text-xs text-muted mt-1 font-medium uppercase tracking-widest">{s.label}</div>
                  </div>
                  {i < STATS.length - 1 && <div className="w-px h-10 bg-amber-200 hidden sm:block"></div>}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <div className="relative w-full max-w-md" style={{ marginTop: '-20px' }}>
              <div className="rounded-3xl overflow-hidden shadow-2xl animate-heroFloat" style={{ height: 450 }}>
                <img src={HERO_IMAGES[0]} alt="Skin treatment" className="w-full h-full object-cover" />
              </div>
              <FloatingBadge top right gradient="linear-gradient(135deg,#FFD700,#FFA500)" icon="fa-star"
                             title="4.9/5" subtitle="Rating" />
              <FloatingBadge bottom left gradient="linear-gradient(135deg,#4CAF50,#2E7D32)" icon="fa-shield-halved"
                             title="Approved" subtitle="FDA Safe" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MARQUEE ---------- */}
      <div className="marquee-wrap">
        <div className="marquee-track text-gold-light text-sm font-medium tracking-widest uppercase">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="flex items-center gap-3">
              <i className="fa-solid fa-spa text-gold"></i> {t}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- WHY CHOOSE US ---------- */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="section-tag">Why Choose Us</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mt-3 mb-3">
            Care that's <span className="text-gold">truly personal</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto mb-12">
            Every plan is built around you — your skin type, your goals, your timeline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY.map((w) => (
              <div key={w.title} className="why-card">
                <div className="why-card-img-wrap">
                  <img src={w.img} alt={w.title} className="why-card-img" loading="lazy" />
                </div>
                <div className="why-card-body text-left">
                  <div className="w-10 h-10 rounded-xl bg-gold-light flex items-center justify-center mb-3">
                    <i className={`fa-solid ${w.icon} text-gold`}></i>
                  </div>
                  <h3 className="font-heading text-lg text-brown mb-1">{w.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{w.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TREATMENTS ---------- */}
      <section className="py-20 bg-cream">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="section-tag">Our Treatments</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mt-3 mb-3">
            Treatments that <span className="text-gold">deliver results</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto mb-12">
            From everyday skincare to advanced procedures — all delivered by certified specialists.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TREATMENTS.map((t) => (
              <div key={t.title} className="bg-white rounded-2xl p-6 border border-gold-light/60 card-hover text-left">
                <div className="w-12 h-12 rounded-xl bg-gold-light flex items-center justify-center mb-4">
                  <i className={`fa-solid ${t.icon} text-gold text-lg`}></i>
                </div>
                <h3 className="font-heading text-xl text-brown mb-2">{t.title}</h3>
                <p className="text-sm text-muted leading-relaxed mb-4">{t.desc}</p>
                <Link to="/services" className="text-sm text-gold font-medium hover:text-brown transition-colors">
                  Learn more <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link to="/services" className="btn-outline">
              View all services <i className="fa-solid fa-arrow-right ml-2"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #5c3d2e 0%, #2c2420 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center text-cream">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Your <span className="text-gold">radiant skin</span> journey starts today
          </h2>
          <p className="text-cream/70 mb-8 max-w-xl mx-auto">
            Book a consultation with our board-certified dermatologists. Same-day slots often available.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/appointment"
              className="inline-flex items-center justify-center bg-gold text-white font-medium rounded-full px-8 py-3.5 hover:bg-gold-light hover:text-brown transition-all"
            >
              <i className="fa-regular fa-calendar-check mr-2"></i> Book Appointment
            </Link>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center justify-center border-2 border-cream/40 text-cream font-medium rounded-full px-8 py-3 hover:bg-cream hover:text-brown transition-all"
            >
              <i className="fa-solid fa-phone mr-2"></i> Call +91 98765 43210
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function FloatingBadge({ top, bottom, left, right, gradient, icon, title, subtitle }) {
  const style = {
    position: 'absolute',
    [top ? 'top' : 'bottom']: -8,
    [left ? 'left' : 'right']: -20,
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
    border: '1px solid rgba(232,213,183,0.4)',
    zIndex: 15,
  };
  return (
    <div style={style} className="animate-badgeFloat">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: gradient }}>
        <i className={`fa-solid ${icon} text-white text-[12px]`}></i>
      </div>
      <div>
        <div className="text-[0.65rem] text-muted font-medium leading-none">{subtitle}</div>
        <div className="text-[0.85rem] font-bold text-brown leading-tight mt-px">{title}</div>
      </div>
    </div>
  );
}
