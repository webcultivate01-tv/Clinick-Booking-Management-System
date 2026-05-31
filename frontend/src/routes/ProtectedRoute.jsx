import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthInitialized, selectUser } from '../store/authSlice';
import Loader from '../components/common/Loader';

/**
 * Gate around every authenticated route. Waits for the initial /me check
 * to finish (so a logged-in user reloading the page isn't bounced to /login),
 * then either renders the child route or sends the user to /login,
 * preserving the original target in `state.from` for a post-login redirect.
 */
export default function ProtectedRoute() {
  const user = useSelector(selectUser);
  const initialized = useSelector(selectAuthInitialized);
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="dash-body flex items-center justify-center">
        <Loader label="Checking your session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
