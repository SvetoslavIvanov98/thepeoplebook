import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

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
          <div key={c.id} className="flex gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
            <img
              src={c.avatar_url || `https://ui-avatars.com/api/?name=${c.username}`}
              alt={c.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-sm">{c.full_name || c.username} <span className="text-gray-400 font-normal text-xs">@{c.username}</span></p>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
