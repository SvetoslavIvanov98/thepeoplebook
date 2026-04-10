import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

export default function StoriesPage() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const user = useAuthStore((s) => s.user);

  const { data: stories } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api.get('/stories/feed').then((r) => r.data),
  });

  const { mutate: uploadStory } = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('media', file);
      return api.post('/stories', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story posted!');
    },
    onError: () => toast.error('Failed to post story'),
  });

  const { mutate: deleteStory } = useMutation({
    mutationFn: (id) => api.delete(`/stories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  });

  // Group by user
  const grouped = (stories || []).reduce((acc, s) => {
    const key = s.user_id;
    if (!acc[key]) acc[key] = { ...s, media: [] };
    acc[key].media.push(s.media_url);
    return acc;
  }, {});

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">Stories</h1>
      </header>

      <div className="p-4 flex gap-4 overflow-x-auto">
        {/* Add story */}
        <div
          onClick={() => fileRef.current.click()}
          className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl border-2 border-dashed border-gray-300">
            +
          </div>
          <span className="text-xs text-gray-500 w-16 text-center truncate">Add Story</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files[0] && uploadStory(e.target.files[0])}
        />

        {Object.values(grouped).map((g) => (
          <div key={g.user_id} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-full ring-2 ring-brand-500 p-0.5">
              <img
                src={g.media[0]}
                alt={g.username}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs text-gray-600 w-16 text-center truncate">@{g.username}</span>
            {g.user_id === user?.id && (
              <button
                onClick={() => stories?.filter((s) => s.user_id === g.user_id).forEach((s) => deleteStory(s.id))}
                className="text-xs text-red-400"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Full story viewer (simple) */}
      {Object.keys(grouped).length === 0 && (
        <div className="p-8 text-center text-gray-400">No active stories. Add one above!</div>
      )}
    </div>
  );
}
