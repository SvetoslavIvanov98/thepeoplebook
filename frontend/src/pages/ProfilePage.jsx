import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import PostCard from '../components/post/PostCard';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me, logout } = useAuthStore();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const { data: profile, isPending } = useQuery({
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
    mutationFn: () => api.patch('/users/me', { bio }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
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

  if (isPending) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!profile) return <div className="p-8 text-center text-gray-400">User not found</div>;

  const isMe = me?.id === profile.id;

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">{profile.full_name || profile.username}</h1>
        <p className="text-xs text-gray-500">{posts?.length || 0} posts</p>
      </header>

      {/* Cover */}
      <div className="h-32 bg-gradient-to-r from-brand-500 to-purple-500" />

      {/* Profile info */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <img
            src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&size=96`}
            alt={profile.username}
            className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-950 object-cover"
          />
          {isMe ? (
            <button
              onClick={() => { setBio(profile.bio || ''); setEditOpen(true); }}
              className="border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit profile
            </button>
          ) : (
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
          )}
        </div>

        <h2 className="font-bold text-xl flex items-center gap-1">
          {profile.full_name || profile.username}
          {profile.is_verified && <span className="text-brand-500">✓</span>}
        </h2>
        <p className="text-gray-500 text-sm">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        <div className="flex gap-4 mt-3 text-sm">
          <span><strong>{profile.following_count}</strong> <span className="text-gray-500">Following</span></span>
          <span><strong>{profile.followers_count}</strong> <span className="text-gray-500">Followers</span></span>
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        {(posts || []).map((p) => <PostCard key={p.id} post={p} />)}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">Edit profile</h3>
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
              onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
              className="w-full text-sm text-red-500 hover:text-red-600 font-medium py-1"
            >
              Delete account…
            </button>
          </div>
        </div>
      )}

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
