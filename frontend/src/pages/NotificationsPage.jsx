import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_LABEL = {
  like: '❤️ liked your post',
  comment: '💬 commented on your post',
  follow: '👤 followed you',
  repost: '🔁 reposted your post',
  message: '✉️ sent you a message',
};

function GroupInviteActions({ notification, onRespond }) {
  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (action) =>
      api.post(`/groups/${notification.group_id}/invite/respond`, { action }),
    onSuccess: (_, action) => {
      toast.success(action === 'accept' ? 'Joined group!' : 'Invite declined');
      onRespond();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isSuccess) return null;

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => mutate('accept')}
        disabled={isPending}
        className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors"
      >
        Accept
      </button>
      <button
        onClick={() => mutate('decline')}
        disabled={isPending}
        className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}

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
        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${!n.read ? 'bg-brand-50 dark:bg-brand-900/10' : 'bg-white dark:bg-gray-950'}`}>
          <Link to={`/${n.actor_username}`}>
            <img
              src={n.actor_avatar || `https://ui-avatars.com/api/?name=${n.actor_username}`}
              alt={n.actor_username}
              className="w-10 h-10 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <Link to={`/${n.actor_username}`} className="font-semibold hover:underline text-gray-900 dark:text-gray-100">
                {n.actor_name || n.actor_username}
              </Link>{' '}
              {n.type === 'group_invite' ? (
                <>
                  invited you to join{' '}
                  <Link to={`/groups/${n.group_id}`} className="font-semibold hover:underline text-brand-600">
                    {n.group_name || 'a group'}
                  </Link>
                </>
              ) : (
                TYPE_LABEL[n.type] || n.type
              )}
            </p>
            <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
            {n.type === 'group_invite' && (
              <GroupInviteActions
                notification={n}
                onRespond={() => qc.invalidateQueries({ queryKey: ['notifications'] })}
              />
            )}
          </div>
          {n.post_id && (
            <Link to={`/post/${n.post_id}`} className="text-xs text-brand-500 hover:underline">View</Link>
          )}
        </div>
      ))}
    </div>
  );
}
