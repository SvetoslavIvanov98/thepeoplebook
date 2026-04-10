import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import PostCard from '../components/post/PostCard';
import MediaLightbox from '../components/MediaLightbox';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

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

  const { data: profile, isPending, isError } = useQuery({
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
      await api.patch('/users/me', form);
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

  const { data: followList, isFetching: followFetching } = useQuery({
    queryKey: ['follow-list', profile?.id, followModal],
    queryFn: () => api.get(`/follows/${profile.id}/${followModal}`).then((r) => r.data),
    enabled: !!profile && !!followModal,
  });

  if (isPending) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (isError) return <div className="p-8 text-center text-red-400">Could not load profile. The server may be unavailable.</div>;
  if (!profile) return <div className="p-8 text-center text-gray-400">User not found</div>;

  const isMe = me?.id === profile.id;

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">{profile.full_name || profile.username}</h1>
        <p className="text-xs text-gray-500">{posts?.length || 0} posts</p>
      </header>

      {/* Cover */}
      <div
        className="relative h-48 bg-gradient-to-r from-brand-500 to-purple-500 overflow-hidden cursor-pointer group"
        onClick={() => {
          if (isMe) coverInputRef.current?.click();
          else if (profile.cover_url) setLightboxUrl(profile.cover_url);
        }}
      >
        {profile.cover_url && (
          <img src={profile.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {isMe ? 'Change cover photo' : (profile.cover_url ? 'View cover photo' : '')}
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
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div
            className="relative w-24 h-24 cursor-pointer group"
            onClick={() => {
              if (isMe) avatarInputRef.current?.click();
              else setLightboxUrl(profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&size=256`);
            }}
          >
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&size=96`}
              alt={profile.username}
              className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-950 object-cover"
            />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-semibold text-center leading-tight px-2">
                {isMe ? 'Change photo' : 'View photo'}
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
            <button
              onClick={() => { setBio(profile.bio || ''); setFullName(profile.full_name || ''); setEditOpen(true); }}
              className="border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => toggleFollow()}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  profile.is_following
                    ? 'border border-gray-300 dark:border-gray-700 hover:border-red-400 hover:text-red-400'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80'
                }`}
              >
                {profile.is_following ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data } = await api.post(`/messages/with/${profile.id}`);
                    navigate(`/messages/${data.id}`);
                  } catch {
                    toast.error('Could not open conversation');
                  }
                }}
                className="border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Message
              </button>
            </div>
          )}
        </div>

        <h2 className="font-bold text-xl flex items-center gap-1">
          {profile.full_name || profile.username}
          {profile.is_verified && <span className="text-brand-500">✓</span>}
        </h2>
        <p className="text-gray-500 text-sm">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        <div className="flex gap-4 mt-3 text-sm">
          <button
            onClick={() => setFollowModal('following')}
            className="hover:underline text-left"
          >
            <strong>{profile.following_count}</strong> <span className="text-gray-500">Following</span>
          </button>
          <button
            onClick={() => setFollowModal('followers')}
            className="hover:underline text-left"
          >
            <strong>{profile.followers_count}</strong> <span className="text-gray-500">Followers</span>
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        {(posts || []).map((p) => <PostCard key={p.id} post={p} />)}
      </div>

      {/* Followers / Following modal */}
      {followModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFollowModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-base capitalize">{followModal}</h3>
              <button onClick={() => setFollowModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800">
              {followFetching && (
                <p className="text-center text-gray-400 py-6 text-sm">Loading…</p>
              )}
              {!followFetching && (!followList || followList.length === 0) && (
                <p className="text-center text-gray-400 py-6 text-sm">No {followModal} yet</p>
              )}
              {(followList || []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => { setFollowModal(null); navigate(`/${u.username}`); }}
                >
                  <img
                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`}
                    alt={u.username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {u.full_name || u.username}
                      {u.is_verified && <span className="ml-1 text-brand-500">✓</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-full border text-sm">Cancel</button>
              <button onClick={() => saveProfile()} className="px-4 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold">Save</button>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
            <button
              onClick={exportData}
              className="w-full text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-1"
            >
              ⬇ Export my data (GDPR)
            </button>
            <button
              onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
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
              This is permanent. All your posts, messages, and data will be deleted and cannot be recovered.
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
                onClick={() => { setDeleteOpen(false); setDeletePassword(''); }}
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
    </div>
  );
}
