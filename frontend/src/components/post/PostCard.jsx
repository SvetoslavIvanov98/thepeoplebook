import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import MediaLightbox from '../MediaLightbox';
import toast from 'react-hot-toast';

function PostContent({ content, media, onMediaClick }) {
  return (
    <>
      {content && (
        <p className="mt-1 text-sm whitespace-pre-wrap break-words">
          {content.split(/(#\w+)/g).map((part, i) =>
            /^#\w+$/.test(part) ? (
              <Link
                key={i}
                to={`/hashtag/${part.slice(1).toLowerCase()}`}
                className="text-brand-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </Link>
            ) : part
          )}
        </p>
      )}
      {media.length > 0 && (
        <div className={`mt-2 grid gap-1 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {media.map((url, i) =>
            url.match(/\.(mp4|mov|avi)/i) ? (
              <div key={i} className="relative cursor-pointer group rounded-xl overflow-hidden" onClick={() => onMediaClick(i)}>
                <video src={url} className="w-full object-cover max-h-72 pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                  <span className="text-white text-5xl leading-none">▶</span>
                </div>
              </div>
            ) : (
              <img
                key={i}
                src={url}
                alt=""
                className="rounded-xl w-full object-cover max-h-72 cursor-pointer hover:brightness-90 transition-[filter]"
                onClick={() => onMediaClick(i)}
              />
            )
          )}
        </div>
      )}
    </>
  );
}

export default function PostCard({ post, onDelete }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // When post is a repost, all actions target the original post
  const targetId = post.repost_id ? post.orig_id : post.id;
  const isRepost = !!post.repost_id;

  const displayContent = isRepost ? post.orig_content : post.content;
  const displayMedia = isRepost
    ? (Array.isArray(post.orig_media_urls) ? post.orig_media_urls : JSON.parse(post.orig_media_urls || '[]'))
    : (Array.isArray(post.media_urls) ? post.media_urls : JSON.parse(post.media_urls || '[]'));
  const displayUser = isRepost
    ? { id: post.orig_user_id, username: post.orig_username, full_name: post.orig_full_name, avatar_url: post.orig_avatar_url, is_verified: post.orig_is_verified }
    : { id: post.user_id, username: post.username, full_name: post.full_name, avatar_url: post.avatar_url, is_verified: post.is_verified };
  const displayCreatedAt = isRepost ? post.orig_created_at : post.created_at;

  const { mutate: toggleLike } = useMutation({
    mutationFn: () => api.post(`/likes/post/${targetId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });

  const { mutate: toggleRepost } = useMutation({
    mutationFn: () => api.post(`/posts/${targetId}/repost`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      toast.success(res.data.reposted ? 'Reposted!' : 'Repost removed');
    },
    onError: () => toast.error('Failed to repost'),
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      if (onDelete) onDelete(post.id);
    },
  });

  // Original post was deleted but repost record exists
  if (isRepost && !post.orig_id) {
    return (
      <article className="p-4 border-b border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400 mb-1">🔁 <Link to={`/${post.username}`} className="hover:underline">@{post.username}</Link> reposted</p>
        <p className="text-sm text-gray-400 italic">[Original post unavailable]</p>
      </article>
    );
  }

  return (
    <article className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
      {/* Repost attribution header */}
      {isRepost && (
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <span>🔁</span>
          <Link to={`/${post.username}`} className="hover:underline font-medium">
            {post.full_name || post.username}
          </Link>
          <span>reposted</span>
        </p>
      )}

      <div className="flex gap-3">
        <Link to={`/${displayUser.username}`} className="shrink-0">
          <img
            src={displayUser.avatar_url || `https://ui-avatars.com/api/?name=${displayUser.username}`}
            alt={displayUser.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/${displayUser.username}`} className="font-semibold hover:underline text-sm">
              {displayUser.full_name || displayUser.username}
            </Link>
            {displayUser.is_verified && <span className="text-brand-500 text-xs">✓</span>}
            <span className="text-gray-400 text-xs">@{displayUser.username}</span>
            <span className="text-gray-400 text-xs">·</span>
            <Link to={`/post/${targetId}`} className="text-gray-400 text-xs hover:underline">
              {formatDistanceToNow(new Date(displayCreatedAt), { addSuffix: true })}
            </Link>
            {user?.id === post.user_id && (
              <button
                onClick={() => deletePost()}
                className="ml-auto text-xs text-red-400 hover:text-red-600"
              >
                {isRepost ? 'Remove repost' : 'Delete'}
              </button>
            )}
          </div>

          <PostContent
            content={displayContent}
            media={displayMedia}
            onMediaClick={setLightboxIndex}
          />

          <MediaLightbox
            items={displayMedia}
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
            <Link to={`/post/${targetId}`} className="flex items-center gap-1 hover:text-brand-500">
              💬 {post.comments_count}
            </Link>
            <button
              onClick={() => toggleRepost()}
              className={`flex items-center gap-1 transition-colors ${post.has_reposted ? 'text-green-500 hover:text-gray-400' : 'hover:text-green-500'}`}
            >
              🔁 {post.reposts_count || 0}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
