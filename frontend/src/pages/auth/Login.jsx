import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { loginThunk, selectAuthError, selectAuthLoading, selectUser, clearError } from '../../store/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [form, setForm] = useState({ email: '', password: '' });

  // Both admin and staff land on /dashboard — the sidebar filters items by role.
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  function submit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Email and password are required');
      return;
    }
    dispatch(loginThunk(form));
  }

  return (
    <section className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 text-muted text-sm hover:text-brown">
          <i className="fa-solid fa-arrow-left"></i> Back to website
        </Link>
        <div className="bg-white rounded-3xl border border-gold-light shadow-soft p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center mb-3">
              <i className="fa-solid fa-spa text-white"></i>
            </div>
            <h1 className="font-heading text-2xl text-brown">Staff / Admin Login</h1>
            <p className="text-xs text-muted mt-1">Patients don't need to login — book directly via the website.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label-base">Email</label>
              <input
                type="email"
                className="input-base"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label-base">Password</label>
              <input
                type="password"
                className="input-base"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
