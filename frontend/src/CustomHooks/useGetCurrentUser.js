import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { serverUrl } from '../App.jsx';
import { setUser, setAuthInitialized } from '../redux/authSlice';

/**
 * Runs once on mount — calls /api/auth/me to figure out whether there is
 * an active session (HTTP-only cookie or Bearer token). Dispatches setUser
 * on success, setAuthInitialized(true) either way.
 */
export default function useGetCurrentUser() {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(serverUrl + '/api/auth/me', { withCredentials: true, headers })
      .then((res) => {
        if (!active) return;
        // Backend now returns { data, message } and the response is read at res.data.
        dispatch(setUser(res.data?.data?.user || null));
      })
      .catch(() => {
        if (!active) return;
        dispatch(setUser(null));
      })
      .finally(() => {
        if (!active) return;
        dispatch(setAuthInitialized(true));
      });

    return () => {
      active = false;
    };
  }, [dispatch]);
}
