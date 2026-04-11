import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import PostCard from '../components/post/PostCard';
import PostComposer from '../components/post/PostComposer';
import toast from 'react-hot-toast';

function PrivacyBadge({ privacy }) {
  return privacy === 'private' ? (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
      🔒 Private
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-600">
      🌐 Public
    </span>
  );
}

function JoinRequestsPanel({ groupId }) {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['group-requests', groupId],
    queryFn: () => api.get(`/groups/${groupId}/requests`).then((r) => r.data),
  });

  const { mutate: respond } = useMutation({
    mutationFn: ({ requestId, action }) =>
      api.post(`/groups/${groupId}/requests/${requestId}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-requests', groupId] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return null;
  if (requests.length === 0)
    return (
      <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-800">
        <p className="font-mono text-xs text-brand-600 uppercase tracking-widest mb-1">// join requests</p>
        <p className="text-sm text-gray-400 font-mono">// no pending requests</p>
      </div>
    );

  return (
    <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
      <p className="font-mono text-xs text-brand-600 uppercase tracking-widest">
        // join requests ({requests.length})
      </p>
      {requests.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <img
            src={r.avatar_url || `https://ui-avatars.com/api/?name=${r.username}`}
            alt={r.username}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{r.full_name || r.username}</p>
            <p className="text-xs text-gray-400">@{r.username}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => respond({ requestId: r.id, action: 'approve' })}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white"
            >
              Approve
            </button>
            <button
              onClick={() => respond({ requestId: r.id, action: 'deny' })}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditGroupModal({ group, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: group.name,
    description: group.description || '',
    privacy: group.privacy,
  });
  const [cover, setCover] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('privacy', form.privacy);
      if (cover) fd.append('cover', cover);
      return api.put(`/groups/${group.id}`, fd);
    },
    onSuccess: ({ data }) => { toast.success('Group updated'); onSaved(data); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate(); }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
      >
        <h2 className="font-extrabold text-xl">Edit group</h2>
        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={80}
            required
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Privacy</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'public', icon: '🌐', label: 'Public' },
              { value: 'private', icon: '🔒', label: 'Private' },
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, privacy: value }))}
                className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                  form.privacy === value
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">New cover image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InviteModal({ groupId, onClose }) {
  const [q, setQ] = useState('');
  const [invited, setInvited] = useState({});

  const { data: results, isFetching } = useQuery({
    queryKey: ['user-search-invite', q],
    queryFn: () => q.trim().length >= 1
      ? api.get('/search', { params: { q } }).then((r) => r.data.users)
      : Promise.resolve([]),
    staleTime: 10_000,
  });

  const { mutate: sendInvite } = useMutation({
    mutationFn: (userId) => api.post(`/groups/${groupId}/invite`, { user_ids: [userId] }),
    onSuccess: (_, userId) => {
      setInvited((p) => ({ ...p, [userId]: true }));
      toast.success('Invite sent!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to send invite'),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/groups/${groupId}`);
    toast.success('Group link copied!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-xl">Invite friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
        >
          <span className="text-2xl">🔗</span>
          <div>
            <p className="font-bold text-sm">Copy group link</p>
            <p className="text-xs text-gray-400 font-mono truncate">{window.location.origin}/groups/{groupId}</p>
          </div>
        </button>

        {/* Search users */}
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username or name…"
            autoFocus
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isFetching && <p className="text-xs text-gray-400 font-mono text-center">// searching…</p>}
          {!isFetching && q.trim() && (results || []).length === 0 && (
            <p className="text-xs text-gray-400 font-mono text-center">// no users found</p>
          )}
          {(results || []).map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-1.5">
              <img
                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`}
                alt={u.username}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{u.full_name || u.username}</p>
                <p className="text-xs text-gray-400">@{u.username}</p>
              </div>
              <button
                onClick={() => sendInvite(u.id)}
                disabled={!!invited[u.id]}
                className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors ${
                  invited[u.id]
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {invited[u.id] ? '✓ Invited' : 'Invite'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}`).then((r) => r.data),
  });

  const { data: posts } = useQuery({
    queryKey: ['group-posts', id],
    queryFn: () => api.get(`/groups/${id}/posts`).then((r) => r.data),
    enabled: !!group && (group.privacy === 'public' || group.is_member),
  });

  const { mutate: toggleMembership, isPending: toggling } = useMutation({
    mutationFn: () => api.post(`/groups/${id}/membership`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] });
      qc.invalidateQueries({ queryKey: ['group-posts', id] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const { mutate: deleteGroup, isPending: deleting } = useMutation({
    mutationFn: () => api.delete(`/groups/${id}`),
    onSuccess: () => { toast.success('Group deleted'); navigate('/groups'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const confirmDelete = () => {
    if (window.confirm('Delete this group and all its posts? This cannot be undone.')) deleteGroup();
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400 font-mono">// loading…</div>;
  if (!group) return <div className="p-8 text-center text-gray-400 font-mono">// group not found</div>;

  const isOwner = user?.id === group.owner_id;
  const isAdmin = group.my_role === 'admin';
  const isMember = group.is_member;
  const isPrivate = group.privacy === 'private';
  const joinRequested = group.join_requested;

  let membershipLabel = 'Join';
  if (isPrivate && !isMember) membershipLabel = joinRequested ? 'Pending…' : 'Request to Join';
  if (isMember) membershipLabel = 'Leave group';

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-brand-600 text-xl shrink-0">←</button>
          <h1 className="font-extrabold text-lg truncate">{group.name}</h1>
          <PrivacyBadge privacy={group.privacy} />
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowEdit(true)} className="text-sm font-semibold text-brand-600 hover:underline">Edit</button>
            {isOwner && (
              <button onClick={confirmDelete} disabled={deleting} className="text-sm font-semibold text-red-500 hover:underline">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </header>

      {/* Cover */}
      <div className="h-40 bg-gradient-to-br from-brand-600 to-purple-600 relative">
        {group.cover_url && (
          <img src={group.cover_url} alt={group.name} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-extrabold text-xl">{group.name}</h2>
        {group.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>}
        <p className="font-mono text-xs text-gray-400 mt-1">{group.members_count} members · by @{group.owner_username}</p>

        {user && user.id !== group.owner_id && (
          <button
            onClick={() => toggleMembership()}
            disabled={toggling || (joinRequested && !isMember)}
            className={`mt-3 px-5 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50 ${
              isMember
                ? 'border border-gray-300 dark:border-gray-700 hover:border-red-400 hover:text-red-500'
                : 'bg-brand-600 hover:bg-brand-700 text-white'
            }`}
          >
            {toggling ? '…' : membershipLabel}
          </button>
        )}
        {isMember && (
          <button
            onClick={() => setShowInvite(true)}
            className="mt-3 ml-2 px-5 py-2 rounded-full text-sm font-bold border border-brand-300 dark:border-brand-700 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            👥 Invite friends
          </button>
        )}
      </div>

      {/* Private + non-member wall */}
      {isPrivate && !isMember && (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-4">🔒</p>
          <h3 className="font-extrabold text-xl mb-2">This group is private</h3>
          <p className="text-gray-500 text-sm">
            {joinRequested
              ? 'Your request to join is pending approval by the group admin.'
              : 'Request to join to see posts and interact with members.'}
          </p>
        </div>
      )}

      {/* Content visible to members (or public groups) */}
      {(!isPrivate || isMember) && (
        <>
          {/* Join requests panel for admins */}
          {isAdmin && <JoinRequestsPanel groupId={id} />}

          {isMember && <PostComposer groupId={id} />}

          {(posts || []).length === 0 && (
            <p className="text-center text-gray-400 font-mono text-sm py-12">// no posts yet</p>
          )}
          {(posts || []).map((p) => <PostCard key={p.id} post={p} />)}
        </>
      )}

      {showEdit && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            qc.setQueryData(['group', id], (old) => ({ ...old, ...updated }));
            setShowEdit(false);
          }}
        />
      )}

      {showInvite && (
        <InviteModal groupId={id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

