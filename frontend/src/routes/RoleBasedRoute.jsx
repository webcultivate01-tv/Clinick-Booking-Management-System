import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';

/**
 * Wraps a sub-tree that only specific roles may access. Used to fence
 * staff out of admin-only pages (Patients, Staff Mgmt, Admins, Services,
 * Gallery, Payments). Renders nothing during the transition.
 *
 *   <Route element={<RoleBasedRoute allow={['admin']} />}>
 *     <Route path="/dashboard/patients" element={<Patients />} />
 *   </Route>
 */
export default function RoleBasedRoute({ allow = [] }) {
  const user = useSelector(selectUser);
  if (!user) return null; // ProtectedRoute above will already have redirected
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
