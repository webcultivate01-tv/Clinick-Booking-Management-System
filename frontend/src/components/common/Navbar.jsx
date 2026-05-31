import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import MobileDrawer from './MobileDrawer';

const NAV = [
  { to: '/',         label: 'Home',     icon: 'fa-house' },
  { to: '/about',    label: 'About',    icon: 'fa-circle-info' },
  { to: '/services', label: 'Services', icon: 'fa-star' },
  { to: '/gallery',  label: 'Gallery',  icon: 'fa-images' },
  { to: '/reviews',  label: 'Reviews',  icon: 'fa-quote-right' },
  { to: '/contact',  label: 'Contact',  icon: 'fa-envelope' },
];

export default function Navbar() {
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        id="navbar"
        className={`sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-amber-100 transition-all duration-300 ${
          scrolled ? 'navbar-scrolled' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center">
              <i className="fa-solid fa-spa text-white text-sm"></i>
            </div>
            <span className="font-heading text-2xl font-semibold text-brown">
              Lumière <span className="text-gold font-heading">Skin</span>
            </span>
          </Link>

          <ul className="desktop-nav hidden md:flex items-center">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `nav-link text-sm font-medium transition-colors ${
                      isActive ? 'active text-brown' : 'text-muted'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="ml-6">
              <Link to="/appointment" className="btn-primary text-sm">
                <i className="fa-regular fa-calendar-check mr-2"></i> Book Now
              </Link>
            </li>
          </ul>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
            className="md:hidden flex flex-col gap-1.5 p-2 bg-none border-none cursor-pointer hamburger"
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </nav>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} nav={NAV} />
    </>
  );
}
