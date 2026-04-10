import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function RightPanel() {
  const { data: suggested } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: () => api.get('/users/suggested').then((r) => r.data),
    staleTime: 60_000,
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
          </div>
        ))}
      </div>
    </aside>
  );
}
