import axios from 'axios';

/**
 * Single configured axios instance.
 * - In dev, `/api` is proxied to localhost:5000 by vite.config.js.
 * - In prod, set VITE_API_URL=https://api.your-domain.com.
 * - `withCredentials: true` so the HTTP-only auth cookie travels both ways.
 */
const baseURL = (import.meta.env.VITE_API_URL || '') + '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Optional Bearer header fallback for browsers that block 3rd-party cookies.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap responses: pass through `data` so callers don't have to do `res.data.data`.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      'Something went wrong. Please try again.';
    const details = err?.response?.data?.details || null;
    const status = err?.response?.status;
    return Promise.reject({ status, message, details });
  }
);
