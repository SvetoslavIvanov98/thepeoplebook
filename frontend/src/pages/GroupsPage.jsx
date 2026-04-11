import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

function PrivacyBadge({ privacy }) {
  return privacy === 'private' ? (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
      🔒 Private
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full">
      🌐 Public
    </span>
  );
}

function GroupCard({ group, onJoin, joining }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
    >
      <div className="h-24 bg-gradient-to-br from-brand-600 to-purple-600 relative">
        {group.cover_url && (
          <img src={group.cover_url} alt={group.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-tight line-clamp-1">{group.name}</h3>
          <PrivacyBadge privacy={group.privacy} />
        </div>
        {group.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{group.description}</p>
        )}
        <p className="font-mono text-xs text-gray-400">{group.members_count} members</p>
        {!group.is_member && (
          <button
            onClick={(e) => { e.preventDefault(); onJoin(group.id); }}
            disabled={joining === group.id}
            className="w-full mt-1 text-sm font-semibold rounded-xl py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors"
          >
            {joining === group.id ? 'Joining…' : group.privacy === 'private' ? 'Request to Join' : 'Join'}
          </button>
        )}
        {group.is_member && (
          <span className="block text-center text-xs font-mono text-gray-400 pt-1">✓ Member</span>
        )}
      </div>
    </Link>
  );
}

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', privacy: 'public' });
  const [cover, setCover] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('privacy', form.privacy);
      if (cover) fd.append('cover', cover);
      return api.post('/groups', fd);
    },
    onSuccess: ({ data }) => {
      toast.success('Group created!');
      onCreated(data);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create group'),
  });

  const handle = (e) => { e.preventDefault(); if (form.name.trim()) mutate(); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={handle}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
      >
        <h2 className="font-extrabold text-xl">Create a group</h2>

        <div>
          <label className="block text-sm font-semibold mb-1">Name <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={80}
            placeholder="e.g. Photography Lovers"
            required
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="What is this group about?"
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Privacy</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'public', icon: '🌐', label: 'Public', desc: 'Anyone can find and join' },
              { value: 'private', icon: '🔒', label: 'Private', desc: 'Members must be approved' },
            ].map(({ value, icon, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, privacy: value }))}
                className={`text-left p-3 rounded-xl border-2 transition-colors ${
                  form.privacy === value
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <p className="font-bold text-sm mt-1">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Cover image <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !form.name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {isPending ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function GroupsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['groups', query],
    queryFn: () => api.get('/groups', { params: query ? { q: query } : {} }).then((r) => r.data),
  });

  const { mutate: joinGroup } = useMutation({
    mutationFn: (id) => api.post(`/groups/${id}/membership`),
    onMutate: (id) => setJoining(id),
    onSettled: () => setJoining(null),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Done!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const publicGroups = data?.public || [];
  const myGroups = data?.mine || [];

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-extrabold text-lg">Groups</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-full"
          >
            + New group
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setQuery(search); }}
          className="mt-3 flex gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search public groups…"
            className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl">
            Search
          </button>
        </form>
      </header>

      <div className="p-4 space-y-8">
        {/* My groups */}
        {myGroups.length > 0 && (
          <section>
            <p className="font-mono text-xs text-brand-600 uppercase tracking-widest mb-3">// your groups</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myGroups.map((g) => (
                <GroupCard key={g.id} group={g} onJoin={joinGroup} joining={joining} />
              ))}
            </div>
          </section>
        )}

        {/* Discover */}
        <section>
          <p className="font-mono text-xs text-brand-600 uppercase tracking-widest mb-3">
            {query ? `// results for "${query}"` : '// discover public groups'}
          </p>
          {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
          {!isLoading && publicGroups.length === 0 && (
            <p className="text-gray-400 text-sm font-mono">// no groups found</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publicGroups.map((g) => (
              <GroupCard key={g.id} group={g} onJoin={joinGroup} joining={joining} />
            ))}
          </div>
        </section>
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(group) => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['groups'] });
          }}
        />
      )}
    </div>
  );
}
