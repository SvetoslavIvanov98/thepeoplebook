import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const TYPE_LABEL = {
  like: '❤️ liked your post',
  comment: '💬 commented on your post',
  follow: '👤 followed you',
  repost: '🔁 reposted your post',
  message: '✉️ sent you a message',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { clearUnread } = useAuthStore();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: () => api.patch('/notifications/read'),
    onSuccess: () => {
      clearUnread();
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10 flex items-center justify-between">
        <h1 className="font-bold text-lg">Notifications</h1>
        <button onClick={() => markRead()} className="text-sm text-brand-600 hover:underline">Mark all read</button>
      </header>

      {(notifications || []).length === 0 && (
        <div className="p-8 text-center text-gray-400">No notifications yet</div>
      )}

      {(notifications || []).map((n) => (
        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${!n.read ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}>
          <Link to={`/${n.actor_username}`}>
            <img
              src={n.actor_avatar || `https://ui-avatars.com/api/?name=${n.actor_username}`}
              alt={n.actor_username}
              className="w-10 h-10 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1">
            <p className="text-sm">
              <Link to={`/${n.actor_username}`} className="font-semibold hover:underline">
                {n.actor_name || n.actor_username}
              </Link>{' '}
              {TYPE_LABEL[n.type] || n.type}
            </p>
            <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
          </div>
          {n.post_id && (
            <Link to={`/post/${n.post_id}`} className="text-xs text-brand-500 hover:underline">View</Link>
          )}
        </div>
      ))}
    </div>
  );
}
