import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_LABEL = {
  like: '❤️ liked your post',
  comment: '💬 commented on your post',
  follow: '👤 followed you',
  repost: '🔁 reposted your post',
  message: '✉️ sent you a message',
  moderation_decision: '⚠️ A moderation decision has been issued on your account',
};

function GroupInviteActions({ notification, onRespond }) {
  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (action) => api.post(`/groups/${notification.group_id}/invite/respond`, { action }),
    onSuccess: (_, action) => {
      toast.success(action === 'accept' ? 'Joined group!' : 'Invite declined');
      onRespond();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isSuccess) return null;

  return (
    <div className="flex gap-3 mt-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => mutate('accept')}
        disabled={isPending}
        className="text-xs font-bold px-4 py-2 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white shadow-sm transition-all"
      >
        Accept
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => mutate('decline')}
        disabled={isPending}
        className="text-xs font-bold px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm transition-all"
      >
        Decline
      </motion.button>
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
    <div className="pb-12">
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50 px-6 py-4 z-10 shadow-sm flex items-center justify-between">
        <h1 className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
          Notifications
        </h1>
        <button
          onClick={() => markRead()}
          className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-full"
        >
          Mark all as read
        </button>
      </header>

      {(notifications || []).length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-16 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
            📭
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            You're all caught up!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No new notifications to display right now.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {(notifications || []).map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-start gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800/50 transition-colors group ${
              !n.read
                ? 'bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20 relative'
                : 'bg-white dark:bg-gray-950 hover:bg-gray-50/50 dark:hover:bg-gray-900/20'
            }`}
          >
            {!n.read && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r-md"></div>
            )}

            {n.type === 'moderation_decision' ? (
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl shrink-0 shadow-sm ring-4 ring-white dark:ring-gray-950">
                ⚠️
              </div>
            ) : (
              <Link to={`/${n.actor_username}`} className="shrink-0 relative">
                <img
                  src={n.actor_avatar || `https://ui-avatars.com/api/?name=${n.actor_username}`}
                  alt={n.actor_username}
                  className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-950 group-hover:shadow transition-shadow"
                />
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-0.5 text-xs shadow-sm">
                  {n.type === 'like' && '❤️'}
                  {n.type === 'comment' && '💬'}
                  {n.type === 'follow' && '👤'}
                  {n.type === 'repost' && '🔁'}
                </div>
              </Link>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-base text-gray-800 dark:text-gray-200 leading-snug">
                {n.type !== 'moderation_decision' && (
                  <Link
                    to={`/${n.actor_username}`}
                    className="font-bold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors mr-1"
                  >
                    {n.actor_name || n.actor_username}
                  </Link>
                )}
                {n.type === 'group_invite' ? (
                  <>
                    invited you to join{' '}
                    <Link
                      to={`/groups/${n.group_id}`}
                      className="font-bold hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-gray-900 dark:text-white"
                    >
                      {n.group_name || 'a group'}
                    </Link>
                  </>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    {n.type === 'like'
                      ? 'liked your post'
                      : n.type === 'comment'
                        ? 'commented on your post'
                        : n.type === 'follow'
                          ? 'followed you'
                          : n.type === 'repost'
                            ? 'reposted your post'
                            : TYPE_LABEL[n.type] || n.type}
                  </span>
                )}
              </p>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>

              {n.type === 'group_invite' && (
                <GroupInviteActions
                  notification={n}
                  onRespond={() => qc.invalidateQueries({ queryKey: ['notifications'] })}
                />
              )}
            </div>

            <div className="shrink-0 flex items-center pt-2">
              {n.post_id && (
                <Link
                  to={`/post/${n.post_id}`}
                  className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-white hover:bg-brand-600 px-3 py-1.5 rounded-full transition-colors bg-brand-50 dark:bg-brand-900/30"
                >
                  View post
                </Link>
              )}
              {n.type === 'moderation_decision' && (
                <Link
                  to="/settings"
                  className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-full transition-colors bg-red-50 dark:bg-red-900/30"
                >
                  Review
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
