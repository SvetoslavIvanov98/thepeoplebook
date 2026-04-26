import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { useLightboxStore } from '../../store/lightbox.store';
import ReportButton from '../ReportButton';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function PostContent({ content, media, onMediaClick }) {
  const renderMedia = () => {
    if (!media || media.length === 0) return null;

    const count = media.length;
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2',
      4: 'grid-cols-2',
    };

    return (
      <div
        className={`mt-3 grid gap-1.5 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 ${gridClasses[Math.min(count, 4)] || 'grid-cols-2'}`}
      >
        {media.slice(0, 4).map((url, i) => {
          const isStr = typeof url === 'string';
          const isVid = isStr && /\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(url);
          
          // Layout logic for 3 images: first image takes full width if on top
          const isFirstOfThree = count === 3 && i === 0;
          const spanClass = isFirstOfThree ? 'col-span-2 aspect-[16/9]' : 'aspect-square';

          return (
            <div
              key={i}
              className={`relative cursor-pointer group/media overflow-hidden bg-gray-200 dark:bg-gray-700 ${spanClass}`}
              onClick={(e) => {
                e.stopPropagation();
                onMediaClick(i);
              }}
            >
              {isVid ? (
                <div className="w-full h-full">
                  <video
                    src={url}
                    className="w-full h-full object-cover pointer-events-none group-hover/media:scale-[1.03] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/media:bg-black/40 transition-colors pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-md rounded-full w-12 h-12 flex items-center justify-center border border-white/30 shadow-xl scale-90 group-hover/media:scale-100 transition-transform duration-300">
                      <span className="text-white text-xl ml-1 leading-none">▶</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full">
                  <img
                    src={isStr ? url : ''}
                    alt=""
                    className="w-full h-full object-cover group-hover/media:scale-[1.03] transition-transform duration-700 ease-out pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                    <span className="bg-white/80 dark:bg-black/60 backdrop-blur-md text-gray-900 dark:text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover/media:translate-y-0 shadow-lg uppercase tracking-wider">
                      View Photo
                    </span>
                  </div>
                </div>
              )}

              {/* +N overlay for 5th+ image */}
              {i === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{count - 4}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {content && (
        <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {content.split(/(#\w+)/g).map((part, i) =>
            part.startsWith('#') ? (
              <Link
                key={i}
                to={`/hashtag/${part.slice(1)}`}
                className="text-brand-600 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </Link>
            ) : (
              part
            )
          )}
        </p>
      )}
      {renderMedia()}
    </div>
  );
}

export default function PostCard({ post, onDelete }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const openLightbox = useLightboxStore((s) => s.openLightbox);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // When post is a repost, all actions target the original post
  const targetId = post.repost_id ? post.orig_id : post.id;
  const isRepost = !!post.repost_id;

  const displayContent = isRepost ? post.orig_content : post.content;
  const parseMedia = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return [];
  };
  const displayMedia = isRepost ? parseMedia(post.orig_media_urls) : parseMedia(post.media_urls);
  const displayUser = isRepost
    ? {
        id: post.orig_user_id,
        username: post.orig_username,
        full_name: post.orig_full_name,
        avatar_url: post.orig_avatar_url,
        is_verified: post.orig_is_verified,
      }
    : {
        id: post.user_id,
        username: post.username,
        full_name: post.full_name,
        avatar_url: post.avatar_url,
        is_verified: post.is_verified,
      };
  const displayCreatedAt = isRepost ? post.orig_created_at : post.created_at;
  const displayEditedAt = isRepost ? post.orig_edited_at : post.edited_at;

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

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      toast.success('Post deleted');
      if (onDelete) onDelete(post.id);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete post'),
  });

  const { mutate: submitEdit, isPending: isSubmittingEdit } = useMutation({
    mutationFn: () => api.patch(`/posts/${targetId}`, { content: editContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      setIsEditing(false);
      toast.success('Post updated');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to edit post'),
  });

  // Original post was deleted but repost record exists
  if (isRepost && !post.orig_id) {
    return (
      <article className="p-5 border-b border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
          🔁{' '}
          <Link to={`/${post.username}`} className="hover:underline font-medium">
            @{post.username}
          </Link>{' '}
          reposted
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-400 italic">[Original post unavailable]</p>
        </div>
      </article>
    );
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="p-6 mb-6 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/10 shadow-soft hover:shadow-xl hover:bg-white/90 dark:hover:bg-black/50 hover:scale-[1.01] transition-all duration-300 relative z-10"
      >
        {/* Repost attribution header */}
        {isRepost && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5 font-medium ml-12">
            <span className="text-green-500">🔁</span>
            <Link
              to={`/${post.username}`}
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {post.full_name || post.username}
            </Link>
            <span className="text-gray-400">reposted</span>
          </p>
        )}

        <div className="flex gap-4">
          <Link to={`/${displayUser.username}`} className="shrink-0 relative group">
            <img
              src={
                displayUser.avatar_url || `https://ui-avatars.com/api/?name=${displayUser.username}`
              }
              alt={displayUser.username}
              className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:shadow transition-shadow"
            />
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Link
                to={`/${displayUser.username}`}
                className="font-bold text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-base truncate"
              >
                {displayUser.full_name || displayUser.username}
              </Link>
              {displayUser.is_verified && <span className="text-brand-500 text-sm ml-1">✓</span>}
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                @{displayUser.username}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  to={`/post/${targetId}`}
                  className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-sm transition-colors"
                >
                  {formatDistanceToNow(new Date(displayCreatedAt), { addSuffix: true })}
                </Link>
                {displayEditedAt && (
                  <span
                    className="text-xs text-gray-400 italic"
                    title={new Date(displayEditedAt).toLocaleString()}
                  >
                    (edited)
                  </span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {user?.id === post.user_id ? (
                  <>
                    {!isRepost && (
                      <button
                        onClick={() => {
                          setEditContent(displayContent || '');
                          setIsEditing(!isEditing);
                        }}
                        className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded-full transition-all font-medium"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                    <button
                      onClick={() => deletePost()}
                      disabled={isDeleting}
                      className="text-xs text-red-400 hover:text-white hover:bg-red-500 disabled:opacity-50 px-2 py-1 rounded-full transition-all font-medium"
                    >
                      {isDeleting ? 'Deleting…' : isRepost ? 'Remove repost' : 'Delete'}
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <ReportButton postId={targetId} />
                  </span>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => submitEdit()}
                    disabled={isSubmittingEdit || editContent === displayContent}
                    className="px-4 py-1.5 bg-brand-600 text-white rounded-full text-sm font-semibold disabled:opacity-50"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <PostContent
                content={displayContent}
                media={displayMedia}
                onMediaClick={(i) => openLightbox(post, i, displayMedia)}
              />
            )}

            <div className="flex items-center gap-8 mt-4 text-gray-500 dark:text-gray-400 font-medium">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleLike()}
                className={`flex items-center gap-2 transition-colors group ${post.liked_by_me ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <div
                  className={`p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-500/10 transition-colors ${post.liked_by_me ? 'bg-red-50 dark:bg-red-500/10' : ''}`}
                >
                  {post.liked_by_me ? '❤️' : '🤍'}
                </div>
                <span className="text-sm">{post.likes_count > 0 ? post.likes_count : ''}</span>
              </motion.button>

              <Link
                to={`/post/${targetId}`}
                className="flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
              >
                <div className="p-2 rounded-full group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                  💬
                </div>
                <span className="text-sm">
                  {post.comments_count > 0 ? post.comments_count : ''}
                </span>
              </Link>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleRepost()}
                className={`flex items-center gap-2 transition-colors group ${post.has_reposted ? 'text-green-500' : 'hover:text-green-500'}`}
              >
                <div
                  className={`p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-500/10 transition-colors ${post.has_reposted ? 'bg-green-50 dark:bg-green-500/10' : ''}`}
                >
                  🔁
                </div>
                <span className="text-sm">{post.reposts_count > 0 ? post.reposts_count : ''}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
}
