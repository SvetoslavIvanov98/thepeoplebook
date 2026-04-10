import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function RightPanel() {
  const qc = useQueryClient();
  const [followed, setFollowed] = useState({});

  const { data: suggested } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: () => api.get('/users/suggested').then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: toggleFollow } = useMutation({
    mutationFn: (userId) => api.post(`/follows/${userId}/toggle`),
    onSuccess: (_, userId) => {
      setFollowed((prev) => ({ ...prev, [userId]: !prev[userId] }));
      qc.invalidateQueries({ queryKey: ['suggested-users'] });
    },
  });

  return (
    <aside className="hidden lg:block w-72 pl-4 py-4 sticky top-0 h-screen overflow-y-auto">
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
        <h2 className="font-bold mb-3">Who to follow</h2>
        {(suggested || []).slice(0, 6).map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2">
            <Link to={`/${u.username}`}>
              <img
                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`}
                alt={u.username}
                className="w-9 h-9 rounded-full object-cover"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/${u.username}`} className="font-semibold text-sm hover:underline truncate block">
                {u.full_name || u.username}
              </Link>
              <p className="text-xs text-gray-500">@{u.username}</p>
            </div>
            <button
              onClick={() => toggleFollow(u.id)}
              className={`text-xs font-semibold rounded-full px-3 py-1 transition-colors flex-shrink-0 ${
                followed[u.id]
                  ? 'border border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-400'
                  : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80'
              }`}
            >
              {followed[u.id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
