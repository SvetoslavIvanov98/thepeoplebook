import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import ReportButton from '../ReportButton';
import toast from 'react-hot-toast';

export default function PostLightbox({
  post,
  items = [],
  index,
  onClose,
  onNav,
  toggleLike,
  toggleRepost,
}) {
  const isOpen = index !== null && index !== undefined;
  const url = isOpen ? items[index] : null;
  const isVideo = url && /\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(url);

  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [commentText, setCommentText] = useState('');

  const targetId = post?.repost_id ? post?.orig_id : post?.id;

  const { data: latestPost } = useQuery({
    queryKey: ['post', targetId],
    queryFn: () => api.get(`/posts/${targetId}`).then((r) => r.data),
    enabled: isOpen && !!targetId,
    initialData: post,
  });

  const activePost = latestPost || post;

  const displayUser = activePost?.repost_id
    ? {
        id: activePost.orig_user_id,
        username: activePost.orig_username,
        full_name: activePost.orig_full_name,
        avatar_url: activePost.orig_avatar_url,
        is_verified: activePost.orig_is_verified,
      }
    : {
        id: activePost?.user_id,
        username: activePost?.username,
        full_name: activePost?.full_name,
        avatar_url: activePost?.avatar_url,
        is_verified: activePost?.is_verified,
      };

  const { mutate: internalToggleLike } = useMutation({
    mutationFn: () => api.post(`/likes/post/${targetId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      qc.invalidateQueries({ queryKey: ['post', targetId] });
    },
  });

  const { mutate: internalToggleRepost } = useMutation({
    mutationFn: () => api.post(`/posts/${targetId}/repost`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      qc.invalidateQueries({ queryKey: ['post', targetId] });
      toast.success(res.data.reposted ? 'Reposted!' : 'Repost removed');
    },
    onError: () => toast.error('Failed to repost'),
  });

  const handleLike = toggleLike || internalToggleLike;
  const handleRepost = toggleRepost || internalToggleRepost;

  const { data: comments } = useQuery({
    queryKey: ['comments', targetId],
    queryFn: () => api.get(`/comments/post/${targetId}`).then((r) => r.data),
    enabled: isOpen && !!targetId,
  });

  const { mutate: addComment, isPending } = useMutation({
    mutationFn: () => api.post(`/comments/post/${targetId}`, { content: commentText }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', targetId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['user-posts'] });
      toast.success('Comment added');
    },
  });

  const prev = useCallback(() => {
    if (index > 0) onNav(index - 1);
  }, [index, onNav]);

  const next = useCallback(() => {
    if (index < items.length - 1) onNav(index + 1);
  }, [index, items.length, onNav]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, prev, next]);

  if (!isOpen || !activePost) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-black/95 md:bg-black/98 backdrop-blur-md transition-all overflow-hidden">
      {/* Left: Media Area */}
      <div
        className="flex-1 relative flex items-center justify-center min-h-[40vh] md:min-h-screen"
        onClick={onClose}
      >
        {/* Close button (mobile or desktop overlay) */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 md:right-4 md:left-auto text-white text-3xl leading-none hover:text-gray-300 transition-colors z-10 w-10 h-10 flex items-center justify-center bg-black/40 rounded-full"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Counter */}
        {items.length > 1 && (
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur rounded-full px-4 py-1">
            {index + 1} / {items.length}
          </span>
        )}

        {/* Prev arrow */}
        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 hover:bg-black/70 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-10"
            aria-label="Previous"
          >
            ‹
          </button>
        )}

        {/* Media */}
        <div
          className="relative w-full h-full flex items-center justify-center p-0 md:p-12"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              key={url}
              src={url}
              controls
              autoPlay
              muted
              playsInline
              className="max-w-full max-h-full md:rounded-xl shadow-2xl bg-black"
            />
          ) : (
            <img
              key={url}
              src={url}
              alt=""
              className="max-w-full max-h-full object-contain md:rounded-xl shadow-2xl select-none"
              draggable={false}
            />
          )}
        </div>

        {/* Next arrow */}
        {index < items.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 hover:bg-black/70 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-10"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>

      {/* Right: Sidebar */}
      <div
        className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-white dark:bg-gray-950 flex flex-col h-[60vh] md:h-screen border-l border-gray-200 dark:border-gray-800 rounded-t-3xl md:rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Author */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white/50 dark:bg-gray-950/50 backdrop-blur z-10">
          <Link to={`/${displayUser.username}`} className="shrink-0" onClick={onClose}>
            <img
              src={
                displayUser.avatar_url || `https://ui-avatars.com/api/?name=${displayUser.username}`
              }
              alt={displayUser.username}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-800"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <Link
                to={`/${displayUser.username}`}
                className="font-bold text-gray-900 dark:text-gray-100 hover:text-brand-600 transition-colors truncate"
                onClick={onClose}
              >
                {displayUser.full_name || displayUser.username}
              </Link>
              {displayUser.is_verified && <span className="text-brand-500 text-xs">✓</span>}
            </div>
            <p className="text-xs text-gray-500 truncate">@{displayUser.username}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/10">
          {/* Post content */}
          {activePost.content && (
            <p className="text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-4">
              {activePost.content}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-around py-3 border-y border-gray-100 dark:border-gray-800 mb-6 bg-white dark:bg-gray-950 rounded-xl shadow-sm">
            <button
              onClick={() => handleLike && handleLike()}
              className={`flex items-center gap-2 transition-colors font-semibold text-sm px-4 py-2 rounded-lg ${activePost.liked_by_me ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <span>{activePost.liked_by_me ? '❤️' : '🤍'}</span>
              <span>{activePost.likes_count > 0 ? activePost.likes_count : 'Like'}</span>
            </button>

            <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors font-semibold text-sm px-4 py-2 rounded-lg cursor-default">
              <span>💬</span>
              <span>{activePost.comments_count > 0 ? activePost.comments_count : 'Comment'}</span>
            </button>

            <button
              onClick={() => handleRepost && handleRepost()}
              className={`flex items-center gap-2 transition-colors font-semibold text-sm px-4 py-2 rounded-lg ${activePost.has_reposted ? 'text-green-500 bg-green-50 dark:bg-green-500/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <span>🔁</span>
              <span>{activePost.reposts_count > 0 ? activePost.reposts_count : 'Repost'}</span>
            </button>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            {!comments && (
              <div className="animate-pulse flex gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="flex-1 h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              </div>
            )}
            {(comments || []).map((c) => (
              <div key={c.id} className="flex gap-2 text-sm group">
                <Link to={`/${c.username}`} onClick={onClose} className="shrink-0 mt-0.5">
                  <img
                    src={c.avatar_url || `https://ui-avatars.com/api/?name=${c.username}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-800"
                  />
                </Link>
                <div className="flex-1 flex flex-col items-start min-w-0">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-full">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link
                        to={`/${c.username}`}
                        className="font-bold hover:underline"
                        onClick={onClose}
                      >
                        {c.full_name || c.username}
                      </Link>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 break-words leading-relaxed text-[14px]">
                      {c.content}
                    </p>
                  </div>
                  {c.user_id !== user?.id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 ml-2">
                      <ReportButton commentId={c.id} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(comments || []).length === 0 && (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block">💭</span>
                <p className="text-gray-400 font-medium">No comments yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Comment Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-end gap-2 shrink-0 z-10">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}`}
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0 mb-0.5 border border-gray-200 dark:border-gray-800"
          />
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-[14px] outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 max-h-24 transition-colors focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-brand-500"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (commentText.trim() && !isPending) addComment();
              }
            }}
          />
          <button
            onClick={() => addComment()}
            disabled={!commentText.trim() || isPending}
            className="shrink-0 bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-brand-500 transition-all mb-0.5 shadow-sm"
            aria-label="Post comment"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 ml-0.5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
