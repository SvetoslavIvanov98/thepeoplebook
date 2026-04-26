import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import PostCard from '../components/post/PostCard';
import ReportButton from '../components/ReportButton';
import MediaLightbox from '../components/MediaLightbox';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage({ user }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: me, logout, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [fullName, setFullName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const {
    data: profile,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
  });

  const { data: posts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => api.get(`/users/${username}/posts`).then((r) => r.data),
    enabled: !!profile,
  });

  const { mutate: toggleFollow } = useMutation({
    mutationFn: () => api.post(`/follows/${profile.id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['suggested-users'] });
    },
  });

  const { mutate: toggleBlock } = useMutation({
    mutationFn: () => api.post(`/users/block/${profile.id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast.success(res.data.blocked ? 'User blocked' : 'User unblocked');
    },
    onError: () => toast.error('Action failed'),
  });

  const { mutate: toggleMute } = useMutation({
    mutationFn: () => api.post(`/users/mute/${profile.id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast.success(res.data.muted ? 'User muted' : 'User unmuted');
    },
    onError: () => toast.error('Action failed'),
  });

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { mutate: saveProfile } = useMutation({
    mutationFn: () => api.patch('/users/me', { bio, full_name: fullName }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      // Keep sidebar in sync
      setUser({ ...me, full_name: res.data.full_name, bio: res.data.bio });
      setEditOpen(false);
      toast.success('Profile updated');
    },
  });

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => api.delete('/users/me', { data: { password: deletePassword } }),
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete account'),
  });

  const uploadPhoto = async (field, file) => {
    if (!file) return;
    const form = new FormData();
    form.append(field, file);
    try {
      const res = await api.patch('/users/me', form);
      if (field === 'avatar' && res.data?.avatar_url) {
        setUser({ ...me, avatar_url: res.data.avatar_url });
      }
      qc.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(field === 'avatar' ? 'Profile photo updated' : 'Cover photo updated');
    } catch {
      toast.error('Upload failed');
    }
  };

  const exportData = async () => {
    try {
      const res = await api.get('/users/me/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thepeoplebook-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export data');
    }
  };

  const {
    data: followData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: followFetching,
  } = useInfiniteQuery({
    queryKey: ['follow-list', profile?.id, followModal],
    queryFn: ({ pageParam = null }) =>
      api
        .get(`/follows/${profile.id}/${followModal}${pageParam ? `?cursor=${pageParam}` : ''}`)
        .then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.length === 20 ? lastPage[lastPage.length - 1].created_at : undefined,
    enabled: !!profile && !!followModal,
  });

  const followList = followData?.pages?.flat() || [];

  if (isPending) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (isError)
    return (
      <div className="p-8 text-center text-red-400">
        Could not load profile. The server may be unavailable.
      </div>
    );
  if (!profile) return <div className="p-8 text-center text-gray-400">User not found</div>;

  const isMe = me?.id === profile.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50 px-6 py-3 z-10 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <div>
          <h1 className="font-extrabold text-xl text-gray-900 dark:text-white leading-tight">
            {profile.full_name || profile.username}
          </h1>
          <p className="text-sm text-gray-500 font-medium">{posts?.length || 0} posts</p>
        </div>
      </header>

      {/* Cover */}
      <div
        className="relative h-56 md:h-64 bg-gradient-to-tr from-brand-600 via-purple-500 to-pink-500 overflow-hidden cursor-pointer group"
        onClick={() => {
          if (isMe) coverInputRef.current?.click();
          else if (profile.cover_url) setLightboxUrl(profile.cover_url);
        }}
      >
        {profile.cover_url && (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            src={profile.cover_url}
            alt="cover"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
          <span className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-md border border-white/30 shadow-soft">
            {isMe ? 'Change cover photo' : profile.cover_url ? 'View cover photo' : ''}
          </span>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => uploadPhoto('cover', e.target.files?.[0])}
        />
      </div>

      {/* Profile info */}
      <div className="px-6 pb-6 relative">
        <div className="flex items-end justify-between -mt-16 mb-4 relative z-10">
          <div
            className="relative w-32 h-32 rounded-full overflow-hidden shadow-soft ring-4 ring-white dark:ring-gray-950 cursor-pointer group shrink-0 bg-gray-100 dark:bg-gray-800"
            onClick={() => {
              if (isMe) avatarInputRef.current?.click();
              else
                setLightboxUrl(
                  profile.avatar_url ||
                    `https://ui-avatars.com/api/?name=${profile.username}&size=256`
                );
            }}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              src={
                profile.avatar_url ||
                `https://ui-avatars.com/api/?name=${profile.username}&size=128`
              }
              alt={profile.username}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-xs font-bold text-center leading-tight px-3">
                {isMe ? 'Update photo' : 'View full'}
              </span>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadPhoto('avatar', e.target.files?.[0])}
            />
          </div>
          {isMe ? (
            <div className="flex gap-3 mb-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setBio(profile.bio || '');
                  setFullName(profile.full_name || '');
                  setEditOpen(true);
                }}
                className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-full px-5 py-2 text-sm font-bold shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                Edit profile
              </motion.button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/settings"
                  className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-full w-10 h-10 flex items-center justify-center shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  ⚙️
                </Link>
              </motion.div>
            </div>
          ) : (
            <div className="flex gap-3 mb-2">
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ···
                </button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-soft z-20 overflow-hidden"
                      onMouseLeave={() => setShowMoreMenu(false)}
                    >
                      <button
                        onClick={() => {
                          toggleMute();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {profile.is_muted ? '🔔 Unmute user' : '🔇 Mute user'}
                      </button>
                      <button
                        onClick={() => {
                          toggleBlock();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        {profile.is_blocked ? '🚫 Unblock user' : '🚫 Block user'}
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-800" />
                      <ReportButton userId={profile.id} variant="menu" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  try {
                    const { data } = await api.post(`/messages/with/${profile.id}`);
                    navigate(`/messages/${data.id}`);
                  } catch {
                    toast.error('Could not open conversation');
                  }
                }}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-full px-5 py-2 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900 shadow-sm"
              >
                Message
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleFollow()}
                disabled={profile.has_blocked_me || profile.is_blocked}
                className={`rounded-full px-6 py-2 text-sm font-bold transition-all shadow-sm disabled:opacity-40 disabled:scale-100 ${
                  profile.is_following
                    ? 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:border-red-200 hover:text-red-500 hover:bg-red-50 dark:hover:border-red-900/50 dark:hover:bg-red-500/10'
                    : 'bg-brand-600 text-white border-2 border-brand-600 hover:bg-brand-700 hover:border-brand-700 dark:bg-brand-500 dark:border-brand-500 dark:hover:bg-brand-600 dark:hover:border-brand-600'
                }`}
              >
                {profile.is_following ? 'Following' : 'Follow'}
              </motion.button>
            </div>
          )}
        </div>

        <div className="mt-2">
          <h2 className="font-extrabold text-2xl flex items-center gap-2 text-gray-900 dark:text-white">
            {profile.full_name || profile.username}
            {profile.is_verified && (
              <span className="text-brand-500 text-xl" title="Verified">
                ✓
              </span>
            )}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-base">
            @{profile.username}
          </p>
        </div>

        {profile.bio && (
          <p className="mt-4 text-base text-gray-800 dark:text-gray-200 leading-relaxed max-w-2xl whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <div className="flex gap-6 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800/50">
          <button
            onClick={() => setFollowModal('following')}
            className="hover:underline text-left group"
          >
            <strong className="text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-lg">
              {profile.following_count}
            </strong>{' '}
            <span className="text-gray-500 dark:text-gray-400">Following</span>
          </button>
          <button
            onClick={() => setFollowModal('followers')}
            className="hover:underline text-left group"
          >
            <strong className="text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-lg">
              {profile.followers_count}
            </strong>{' '}
            <span className="text-gray-500 dark:text-gray-400">Followers</span>
          </button>
        </div>
      </div>

      <div className="h-2 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800/50" />

      {/* Posts */}
      <div className="mb-8">
        {(posts || []).map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {(posts || []).length === 0 && (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
            <span className="text-4xl mb-4 opacity-50">📝</span>
            <p className="font-medium">@{profile.username} hasn't posted anything yet.</p>
          </div>
        )}
      </div>

      {/* Followers / Following modal */}
      <AnimatePresence>
        {followModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setFollowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="font-extrabold text-lg capitalize">{followModal}</h3>
                <button
                  onClick={() => setFollowModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {followFetching && (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
                  </div>
                )}
                {!followFetching && (!followList || followList.length === 0) && (
                  <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                    <span className="text-3xl mb-2 opacity-50">👥</span>
                    <p className="font-medium">No {followModal} found</p>
                  </div>
                )}
                {(followList || []).map((u) => (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={u.id}
                    className="flex items-center gap-4 px-4 py-3 mx-2 my-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setFollowModal(null);
                      navigate(`/${u.username}`);
                    }}
                  >
                    <img
                      src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`}
                      alt={u.username}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {u.full_name || u.username}
                        </p>
                        {u.is_verified && <span className="text-brand-500 text-sm">✓</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {hasNextPage && (
                  <div className="py-4 text-center">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 px-4 py-2 rounded-full transition-colors"
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">Edit profile</h3>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Display name"
              maxLength={100}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Bio"
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-full border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => saveProfile()}
                className="px-4 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
            <button
              onClick={exportData}
              className="w-full text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-1"
            >
              ⬇ Export my data (GDPR)
            </button>
            <button
              onClick={() => {
                setEditOpen(false);
                setDeleteOpen(true);
              }}
              className="w-full text-sm text-red-500 hover:text-red-600 font-medium py-1"
            >
              Delete account…
            </button>
          </div>
        </div>
      )}

      {/* Media lightbox for cover / avatar */}
      <MediaLightbox
        items={lightboxUrl ? [lightboxUrl] : []}
        index={lightboxUrl ? 0 : null}
        onClose={() => setLightboxUrl(null)}
        onNav={() => {}}
      />

      {/* Delete account confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg text-red-500">Delete account</h3>
            <p className="text-sm text-gray-500">
              This is permanent. All your posts, messages, and data will be deleted and cannot be
              recovered.
            </p>
            {me?.password_hash !== false && (
              <input
                type="password"
                placeholder="Confirm your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword('');
                }}
                className="px-4 py-2 rounded-full border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccount()}
                disabled={deleting}
                className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
