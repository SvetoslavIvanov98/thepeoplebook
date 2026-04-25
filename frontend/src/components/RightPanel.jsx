import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <aside className="hidden lg:block w-72 p-6 glass rounded-[2rem] shadow-xl sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto border-none">
      <div className="bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/30 dark:border-white/5 shadow-soft">
        <h2 className="font-extrabold text-lg mb-4 text-gray-900 dark:text-white tracking-tight">
          Who to follow
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {(suggested || []).slice(0, 6).map((u) => (
            <motion.div
              variants={itemVariants}
              key={u.id}
              className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white dark:hover:bg-gray-800/80 transition-colors group"
            >
              <Link to={`/${u.username}`} className="relative shrink-0">
                <img
                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`}
                  alt={u.username}
                  className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:shadow transition-shadow"
                />
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/${u.username}`}
                  className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 truncate block transition-colors"
                >
                  {u.full_name || u.username}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleFollow(u.id)}
                className={`text-xs font-bold rounded-full px-4 py-1.5 transition-all shadow-sm ${
                  followed[u.id]
                    ? 'border-2 border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:border-red-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-500 dark:hover:text-white'
                }`}
              >
                {followed[u.id] ? 'Following' : 'Follow'}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </aside>
  );
}
