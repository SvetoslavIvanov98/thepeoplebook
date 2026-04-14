import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function AdminGroupsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'groups', page],
    queryFn: () => api.get('/admin/groups', { params: { page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'groups'] }),
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Groups</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Group</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold text-center">Members</th>
              <th className="px-4 py-3 font-semibold text-center">Posts</th>
              <th className="px-4 py-3 font-semibold">Privacy</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {data?.groups?.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <Link to={`/groups/${g.id}`} target="_blank" className="font-medium hover:text-brand-600">
                    {g.name}
                  </Link>
                  {g.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{g.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">@{g.owner_username}</td>
                <td className="px-4 py-3 text-center">{g.member_count}</td>
                <td className="px-4 py-3 text-center">{g.post_count}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    g.privacy === 'public'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {g.privacy}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(g.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete group "${g.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate(g.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete group"
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
