import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function AuthCallbackPage() {
  const { setTokens, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Access token is passed in the URL fragment; refresh token is in HttpOnly cookie
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    if (token) {
      setTokens(token);
      fetchMe().then(() => navigate('/'));
    } else {
      navigate('/login?error=oauth');
    }
  }, []);

  return <div className="p-8 text-center text-gray-400">Signing you in…</div>;
}
