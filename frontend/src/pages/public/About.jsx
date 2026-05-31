import { Link } from 'react-router-dom';

export default function About() {
  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="section-tag">About Us</span>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-charcoal mt-3 mb-4">
          Personalised <span className="text-gold">dermatology care</span>, since 2012
        </h1>
        <p className="text-muted leading-relaxed max-w-2xl mx-auto mb-6">
          Lumière Skin Clinic combines the precision of evidence-based dermatology with the warmth of bespoke patient care.
          Our team of board-certified specialists has treated over 8,000 patients across India and abroad — each with a plan
          built around their unique skin, lifestyle and goals.
        </p>
        <p className="text-muted leading-relaxed max-w-2xl mx-auto mb-10">
          From the latest FDA-cleared lasers to time-tested clinical protocols, every treatment at Lumière is delivered
          with one promise: real, lasting results in a calm, confidential, hospital-grade environment.
        </p>
        <Link to="/appointment" className="btn-primary">
          <i className="fa-regular fa-calendar-check mr-2"></i> Book Your Consultation
        </Link>
      </div>

      <p className="text-center text-xs text-muted/70 mt-12">
        Full About page content lands in the next update.
      </p>
    </section>
  );
}
