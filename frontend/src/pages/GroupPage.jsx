import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import PostCard from '../components/post/PostCard';
import PostComposer from '../components/post/PostComposer';

export default function GroupPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: group } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}`).then((r) => r.data),
  });

  const { data: posts } = useQuery({
    queryKey: ['group-posts', id],
    queryFn: () => api.get(`/groups/${id}/posts`).then((r) => r.data),
  });

  const { mutate: toggleMembership } = useMutation({
    mutationFn: () => api.post(`/groups/${id}/membership`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', id] }),
  });

  if (!group) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">{group.name}</h1>
      </header>

      {group.cover_url && (
        <img src={group.cover_url} alt={group.name} className="w-full h-40 object-cover" />
      )}

      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-bold text-xl">{group.name}</h2>
        {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
        <p className="text-sm text-gray-400 mt-1">{group.members_count} members</p>
        {group.owner_id !== user?.id && (
          <button
            onClick={() => toggleMembership()}
            className="mt-3 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {group.is_member ? 'Leave group' : 'Join group'}
          </button>
        )}
      </div>

      <PostComposer groupId={id} />

      {(posts || []).map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}
