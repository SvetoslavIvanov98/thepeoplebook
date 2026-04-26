import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import ReportButton from '../components/ReportButton';
import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

function CommentItem({ comment, user, postId }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const { mutate: editComment, isPending: isEditingPending } = useMutation({
    mutationFn: () => api.patch(`/comments/${comment.id}`, { content: editContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      setIsEditing(false);
      toast.success('Comment updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to edit comment'),
  });

  const { mutate: deleteComment, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete(`/comments/${comment.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete comment'),
  });

  return (
    <div className="flex gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
      <img
        src={comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.username}`}
        alt={comment.username}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">
            {comment.full_name || comment.username}{' '}
            <span className="text-gray-400 font-normal text-xs">@{comment.username}</span>
            <span className="text-gray-400 font-normal text-xs ml-1">
              · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.edited_at && (
              <span className="text-gray-400 font-normal text-xs ml-1 italic">(edited)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {comment.user_id === user?.id ? (
              <>
                <button
                  onClick={() => {
                    setEditContent(comment.content);
                    setIsEditing(!isEditing);
                  }}
                  className="text-xs text-gray-500 hover:text-brand-600 transition-colors"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => deleteComment()}
                  disabled={isDeleting}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            ) : (
              <ReportButton commentId={comment.id} />
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none min-h-[60px]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => editComment()}
                disabled={isEditingPending || editContent === comment.content}
                className="px-3 py-1 bg-brand-600 text-white rounded-full text-xs font-semibold disabled:opacity-50"
              >
                {isEditingPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap mt-1">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams();
  const [comment, setComment] = useState('');
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data),
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.get(`/comments/post/${id}`).then((r) => r.data),
  });

  const { mutate: addComment, isPending } = useMutation({
    mutationFn: () => api.post(`/comments/post/${id}`, { content: comment }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      toast.success('Comment added');
    },
  });

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">Post</h1>
      </header>

      {post && <PostCard post={post} />}

      {/* Comment box */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex gap-3">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}`}
          alt=""
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            rows={2}
            className="w-full resize-none bg-transparent outline-none text-sm placeholder-gray-400"
          />
          <button
            onClick={() => addComment()}
            disabled={!comment.trim() || isPending}
            className="mt-1 bg-brand-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-sm font-semibold"
          >
            Comment
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div>
        {(comments || []).map((c) => (
          <CommentItem key={c.id} comment={c} user={user} postId={id} />
        ))}
      </div>
    </div>
  );
}
