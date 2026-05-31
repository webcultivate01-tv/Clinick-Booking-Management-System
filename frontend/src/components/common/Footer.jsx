import { Link } from 'react-router-dom';

const QUICK = [
  { to: '/',            label: 'Home' },
  { to: '/about',       label: 'About Us' },
  { to: '/services',    label: 'Services' },
  { to: '/gallery',     label: 'Gallery' },
  { to: '/contact',     label: 'Contact' },
  { to: '/appointment', label: 'Book Appointment' },
];

const SERVICES = [
  'HydraFacial', 'Laser Treatment', 'Chemical Peels',
  'Botox & Fillers', 'PRP Therapy', 'Acne Solutions',
];

export default function Footer() {
  return (
    <footer className="bg-ink">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10"
             style={{ borderBottom: '1px solid rgba(184,147,90,0.18)' }}>

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #b8935a, #8a6a3a)' }}
              >
                <i className="fa-solid fa-spa text-white text-base"></i>
              </div>
              <div>
                <div className="font-heading font-bold text-white leading-none" style={{ fontSize: '1.15rem' }}>
                  Lumière <span className="text-gold">Skin</span>
                </div>
                <div className="text-[0.7rem] text-white/45 tracking-wider mt-0.5">Advanced Dermatology Care</div>
              </div>
            </div>
            <p className="text-[0.82rem] text-white/50 leading-relaxed mb-5">
              Your trusted skin clinic for comprehensive dermatology care. Combining compassionate care with cutting-edge technology since 2012.
            </p>
            <div className="flex gap-2">
              {[
                { href: '#',                              icon: 'fa-brands fa-facebook-f' },
                { href: '#',                              icon: 'fa-brands fa-instagram' },
                { href: '#',                              icon: 'fa-brands fa-youtube' },
                { href: 'https://wa.me/919876543210',     icon: 'fa-brands fa-whatsapp' },
              ].map((s, i) => (
                <a key={i} href={s.href}
                   className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[0.85rem] text-white/60 transition-colors hover:text-white"
                   style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <i className={s.icon}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <FooterColumn title="Quick Links">
            {QUICK.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="footer-link"><span className="text-gold text-[0.7rem]">›</span> {l.label}</Link>
              </li>
            ))}
          </FooterColumn>

          {/* Services */}
          <FooterColumn title="Our Services">
            {SERVICES.map((s) => (
              <li key={s}>
                <Link to="/services" className="footer-link"><span className="text-gold text-[0.7rem]">›</span> {s}</Link>
              </li>
            ))}
          </FooterColumn>

          {/* Contact */}
          <div>
            <h5 className="text-[0.72rem] font-bold tracking-[0.12em] uppercase text-gold mb-[18px]">Contact Us</h5>
            <ul className="m-0 p-0 list-none flex flex-col gap-[14px]">
              <ContactItem icon="fa-phone" label="Phone">
                <a href="tel:+919876543210" className="text-white/70 text-[0.84rem] hover:text-gold">+91 98765 43210</a>
              </ContactItem>
              <ContactItem icon="fa-envelope" label="Email">
                <a href="mailto:hello@lumiereskin.com" className="text-white/70 text-[0.84rem] hover:text-gold">hello@lumiereskin.com</a>
              </ContactItem>
              <ContactItem icon="fa-location-dot" label="Address">
                <span className="text-white/70 text-[0.84rem]">123, Skin Street, Near City Hospital,<br/>Nashik, Maharashtra — 422001</span>
              </ContactItem>
              <ContactItem icon="fa-clock" label="Hours">
                <span className="text-white/70 text-[0.84rem]">Mon–Sat: 9 AM – 7 PM</span><br/>
                <span className="text-gold text-[0.82rem]">Sun: Emergency Only</span>
              </ContactItem>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-[18px] flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-[0.78rem] text-white/30 m-0">&copy; {new Date().getFullYear()} Lumière Skin Clinic. All rights reserved</p>
          <p className="text-[0.78rem] text-white/30 m-0">
            Designed by <a href="#" className="text-gold font-semibold">WebCultivate Software Solutions</a>
          </p>
        </div>
      </div>

      <style>{`
        .footer-link {
          font-size: 0.84rem;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }
        .footer-link:hover { color: #b8935a; }
      `}</style>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h5 className="text-[0.72rem] font-bold tracking-[0.12em] uppercase text-gold mb-[18px]">{title}</h5>
      <ul className="m-0 p-0 list-none flex flex-col gap-[10px]">{children}</ul>
    </div>
  );
}

function ContactItem({ icon, label, children }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-px"
           style={{ background: 'rgba(184,147,90,0.15)' }}>
        <i className={`fa-solid ${icon} text-gold text-[0.8rem]`}></i>
      </div>
      <div>
        <div className="text-[0.65rem] font-bold tracking-widest uppercase text-white/35 mb-0.5">{label}</div>
        {children}
      </div>
    </li>
  );
}
