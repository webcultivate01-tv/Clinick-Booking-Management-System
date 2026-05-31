import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import WhatsAppFab from '../common/WhatsAppFab';

export default function PublicLayout() {
  const { pathname } = useLocation();

  // Scroll to top on every navigation. Important on mobile where back/forward
  // would otherwise preserve scroll position from the previous page.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  );
}
