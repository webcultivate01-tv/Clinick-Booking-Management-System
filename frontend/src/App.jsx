import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';
import { loadCurrentUser } from './store/authSlice';

// Public
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import ServiceDetails from './pages/public/ServiceDetails';
import Gallery from './pages/public/Gallery';
import Reviews from './pages/public/Reviews';
import Contact from './pages/public/Contact';
import Appointment from './pages/public/Appointment';
import BookingConfirmation from './pages/public/BookingConfirmation';

// Auth
import Login from './pages/auth/Login';

// Dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import TodayBookings from './pages/dashboard/TodayBookings';
import Appointments from './pages/dashboard/Appointments';
import Patients from './pages/dashboard/Patients';
import Enquiries from './pages/dashboard/Enquiries';
import ReviewsManage from './pages/dashboard/ReviewsManage';
import Payments from './pages/dashboard/Payments';
import ServicesManage from './pages/dashboard/ServicesManage';
import GalleryManage from './pages/dashboard/GalleryManage';
import StaffManage from './pages/dashboard/StaffManage';
import AdminManage from './pages/dashboard/AdminManage';
import OpdSchedule from './pages/dashboard/OpdSchedule';
import Settings from './pages/dashboard/Settings';

export default function App() {
  const dispatch = useDispatch();

  // Pre-check whether the user is already logged in (cookie session) so
  // dashboard route guards don't bounce them on first paint.
  useEffect(() => { dispatch(loadCurrentUser()); }, [dispatch]);

  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetails />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route path="/appointment/confirmation/:id" element={<BookingConfirmation />} />
      </Route>

      <Route path="/login" element={<Login />} />

      {/* Dashboard — requires auth. Admin-only pages are nested under a
          RoleBasedRoute so staff hitting the URL directly get bounced. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Both roles */}
          <Route index element={<DashboardHome />} />
          <Route path="today" element={<TodayBookings />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="opd"          element={<OpdSchedule />} />
          <Route path="gallery"      element={<GalleryManage />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="reviews" element={<ReviewsManage />} />
          <Route path="settings" element={<Settings />} />

          {/* Admin-only */}
          <Route element={<RoleBasedRoute allow={['admin']} />}>
            <Route path="patients" element={<Patients />} />
            <Route path="payments" element={<Payments />} />
            <Route path="services" element={<ServicesManage />} />
            <Route path="staff"    element={<StaffManage />} />
            <Route path="admins"   element={<AdminManage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
