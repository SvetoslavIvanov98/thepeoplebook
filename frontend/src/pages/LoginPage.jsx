import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/auth/login', form),
    onSuccess: ({ data }) => {
      login(data.user, data.token);
      navigate('/');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Login failed'),
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-center">Sign in</h2>
      <input
        type="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <img src="https://developers.google.com/identity/images/g-logo.png" alt="G" className="w-5 h-5" />
        Continue with Google
      </a>
      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-600 hover:underline font-medium">Register</Link>
      </p>
    </form>
  );
}
