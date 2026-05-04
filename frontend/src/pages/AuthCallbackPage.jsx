import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';

export default function AuthCallbackPage() {
  const { setTokens, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    // Fallback: direct token param (used when Redis is unavailable)
    const directToken = params.get('token');

    if (code) {
      // C-2: Exchange the one-time code for a real access token.
      // The code is consumed on first use; the token never appears in browser history.
      api
        .post('/auth/exchange', { code })
        .then(({ data }) => {
          // Clear the code from the URL so it doesn't linger in history
          window.history.replaceState(null, '', '/auth/callback');
          setTokens(data.token);
          return fetchMe();
        })
        .then(() => navigate('/'))
        .catch(() => navigate('/login?error=oauth'));
    } else if (directToken) {
      // Redis-unavailable fallback path
      window.history.replaceState(null, '', '/auth/callback');
      setTokens(directToken);
      fetchMe()
        .then(() => navigate('/'))
        .catch(() => navigate('/login?error=oauth'));
    } else {
      navigate('/login?error=oauth');
    }
  }, []);

  return <div className="p-8 text-center text-gray-400">Signing you in…</div>;
}
