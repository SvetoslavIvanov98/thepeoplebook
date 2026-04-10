import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import MediaLightbox from '../MediaLightbox';
import toast from 'react-hot-toast';

export default function PostCard({ post, onDelete }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const { mutate: toggleLike } = useMutation({
    mutationFn: () => api.post(`/likes/post/${post.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const { mutate: repost } = useMutation({
    mutationFn: () => api.post(`/posts/${post.id}/repost`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Reposted!');
    },
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      if (onDelete) onDelete(post.id);
    },
  });

  const media = Array.isArray(post.media_urls) ? post.media_urls : JSON.parse(post.media_urls || '[]');

  return (
    <article className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
      <div className="flex gap-3">
        <Link to={`/${post.username}`} className="shrink-0">
          <img
            src={post.avatar_url || `https://ui-avatars.com/api/?name=${post.username}`}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/${post.username}`} className="font-semibold hover:underline text-sm">
              {post.full_name || post.username}
            </Link>
            {post.is_verified && <span className="text-brand-500 text-xs">✓</span>}
            <span className="text-gray-400 text-xs">@{post.username}</span>
            <span className="text-gray-400 text-xs">·</span>
            <Link to={`/post/${post.id}`} className="text-gray-400 text-xs hover:underline">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Link>
            {user?.id === post.user_id && (
              <button
                onClick={() => deletePost()}
                className="ml-auto text-xs text-red-400 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>

          {post.content && (
            <p className="mt-1 text-sm whitespace-pre-wrap break-words">{post.content}</p>
          )}

          {media.length > 0 && (
            <div className={`mt-2 grid gap-1 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {media.map((url, i) => (
                url.match(/\.(mp4|mov|avi)/i)
                  ? (
                    <div key={i} className="relative cursor-pointer group rounded-xl overflow-hidden" onClick={() => setLightboxIndex(i)}>
                      <video src={url} className="w-full object-cover max-h-72 pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <span className="text-white text-5xl leading-none">▶</span>
                      </div>
                    </div>
                  )
                  : (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="rounded-xl w-full object-cover max-h-72 cursor-pointer hover:brightness-90 transition-[filter]"
                      onClick={() => setLightboxIndex(i)}
                    />
                  )
              ))}
            </div>
          )}

          <MediaLightbox
            items={media}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNav={setLightboxIndex}
          />

          <div className="flex items-center gap-6 mt-3 text-gray-400 text-sm">
            <button
              onClick={() => toggleLike()}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${post.liked_by_me ? 'text-red-500' : ''}`}
            >
              {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count}
            </button>
            <Link to={`/post/${post.id}`} className="flex items-center gap-1 hover:text-brand-500">
              💬 {post.comments_count}
            </Link>
            <button
              onClick={() => repost()}
              className="flex items-center gap-1 hover:text-green-500"
            >
              🔁 {post.reposts_count || 0}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
