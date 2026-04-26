import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

function StoryViewer({ groups, initialIndex, onClose, onDelete, currentUserId }) {
  const [groupIndex, setGroupIndex] = useState(initialIndex);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const group = groups[groupIndex];
  const mediaUrl = group?.media[mediaIndex];
  const isVideo = mediaUrl && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaUrl);

  const goNext = useCallback(() => {
    if (mediaIndex < group.media.length - 1) {
      setMediaIndex((i) => i + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setMediaIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [mediaIndex, groupIndex, group, groups, onClose]);

  const goPrev = () => {
    if (mediaIndex > 0) {
      setMediaIndex((i) => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setMediaIndex(0);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (isVideo) return; // video controls its own timing
    setProgress(0);
    clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [mediaIndex, groupIndex, isVideo, goNext]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, onClose]);

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-[100dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {group.media.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < mediaIndex ? '100%' : i === mediaIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-2 right-2 z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {group.avatar_url ? (
              <img src={group.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-500 border border-white flex items-center justify-center text-white text-xs font-bold">
                {group.username?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-white text-sm font-semibold drop-shadow">{group.username}</span>
          </div>
          <button onClick={onClose} className="text-white text-2xl leading-none drop-shadow">&times;</button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center bg-black">
          {isVideo ? (
            <video
              key={mediaUrl}
              src={mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={goNext}
            />
          ) : (
            <img key={mediaUrl} src={mediaUrl} className="max-h-full max-w-full object-contain" alt="story" />
          )}
        </div>

        {/* Tap areas */}
        <div className="absolute inset-0 flex top-16 bottom-16">
          <div className="flex-1 cursor-pointer" onClick={goPrev} />
          <div className="flex-1 cursor-pointer" onClick={goNext} />
        </div>

        {/* Delete button for own stories */}
        {group.user_id === currentUserId && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
            <button
              onClick={() => { onDelete(group); onClose(); }}
              className="bg-red-500/80 text-white text-xs px-4 py-1.5 rounded-full"
            >
              Delete Story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoriesPage() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const user = useAuthStore((s) => s.user);
  const [viewerIndex, setViewerIndex] = useState(null);

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

  // Group by user, preserving insertion order
  const grouped = (stories || []).reduce((acc, s) => {
    const key = s.user_id;
    if (!acc[key]) acc[key] = { ...s, media: [], ids: [] };
    acc[key].media.push(s.media_url);
    acc[key].ids.push(s.id);
    return acc;
  }, {});
  const groupList = Object.values(grouped);

  const handleDeleteGroup = (group) => {
    group.ids.forEach((id) => deleteStory(id));
  };

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

        {groupList.map((g, idx) => (
          <div
            key={g.user_id}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
            onClick={() => setViewerIndex(idx)}
          >
            <div className="w-16 h-16 rounded-full ring-2 ring-brand-500 p-0.5">
              <img
                src={g.media[0]}
                alt={g.username}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs text-gray-600 w-16 text-center truncate">@{g.username}</span>
          </div>
        ))}
      </div>

      {groupList.length === 0 && (
        <div className="p-8 text-center text-gray-400">No active stories. Add one above!</div>
      )}

      {viewerIndex !== null && (
        <StoryViewer
          groups={groupList}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={handleDeleteGroup}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
