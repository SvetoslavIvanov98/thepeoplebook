import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function AdminPostsPage() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', page, search],
    queryFn: () => api.get('/admin/posts', { params: { page, limit: 20, q: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Posts</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search post content…"
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
              <th className="px-4 py-3 font-semibold">Author</th>
              <th className="px-4 py-3 font-semibold">Content</th>
              <th className="px-4 py-3 font-semibold text-center">Likes</th>
              <th className="px-4 py-3 font-semibold text-center">Comments</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {data?.posts?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <Link to={`/${p.username}`} target="_blank" className="flex items-center gap-2 hover:text-brand-600">
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.username}&size=28`}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-medium">{p.username}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <Link to={`/post/${p.id}`} target="_blank" className="hover:text-brand-600 line-clamp-2 text-gray-700 dark:text-gray-300">
                    {p.content || <span className="text-gray-400 italic">[media only]</span>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center">{p.like_count}</td>
                <td className="px-4 py-3 text-center">{p.comment_count}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this post?')) deleteMutation.mutate(p.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete post"
                  >
                    <Trash2 size={15} />
                  </button>
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
