import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', date_of_birth: '' });
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/auth/register', form),
    onSuccess: ({ data }) => {
      login(data.user, data.token);
      navigate('/');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Registration failed'),
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-center">Create account</h2>
      <input type="text" placeholder="Full name" value={form.full_name} onChange={set('full_name')}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
      <input type="text" placeholder="Username" required value={form.username} onChange={set('username')}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
      <input type="email" placeholder="Email" required value={form.email} onChange={set('email')}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
      <input type="password" placeholder="Password (min 8 chars)" required minLength={8} value={form.password} onChange={set('password')}
        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date of birth</label>
        <input type="date" required value={form.date_of_birth} onChange={set('date_of_birth')}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={agreedToPrivacy}
          onChange={(e) => setAgreedToPrivacy(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
        />
        <span>
          I have read and agree to the{' '}
          <Link to="/privacy" className="text-brand-600 hover:underline font-medium" target="_blank">
            Privacy Policy
          </Link>
          . I understand how my data is collected and used.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={agreedToAge}
          onChange={(e) => setAgreedToAge(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
        />
        <span>I confirm that I am at least <strong>16 years old</strong>. Users under 16 require parental consent under EU law (GDPR Art. 8).</span>
      </label>
      <button type="submit" disabled={isPending || !agreedToPrivacy || !agreedToAge}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl">
        {isPending ? 'Creating account…' : 'Register'}
      </button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
      </p>
    </form>
  );
}
