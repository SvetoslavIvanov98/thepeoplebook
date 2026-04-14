import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => api.get('/admin/users', { params: { page, limit: 20, q: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, banned }) => api.patch(`/admin/users/${id}/ban`, { banned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Users</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username, email, name…"
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button type="submit" className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setQ(''); setPage(1); }} className="text-sm text-gray-500 px-2">
            Clear
          </button>
        )}
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold text-center">Posts</th>
              <th className="px-4 py-3 font-semibold text-center">Followers</th>
              <th className="px-4 py-3 font-semibold text-center">Role</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {data?.users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <Link to={`/${u.username}`} target="_blank" className="flex items-center gap-2 hover:text-brand-600">
                    <img
                      src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&size=32`}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="font-medium">{u.username}</span>
                    {u.is_verified && <span className="text-brand-500 text-xs">✓</span>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-center">{u.post_count}</td>
                <td className="px-4 py-3 text-center">{u.followers_count}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.is_banned ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {u.is_banned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {currentUser?.id !== u.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => roleMutation.mutate({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => banMutation.mutate({ id: u.id, banned: !u.is_banned })}
                        className={`text-xs px-2 py-1 rounded ${
                          u.is_banned
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-gray-500">Page {page} of {data.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-3 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
