import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';

export default function PostComposer({ groupId = null }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const fileRef = useRef();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('content', content);
      if (groupId) fd.append('group_id', groupId);
      files.forEach((f) => fd.append('media', f));
      return api.post('/posts', fd);
    },
    onSuccess: () => {
      setContent('');
      setFiles([]);
      qc.invalidateQueries({ queryKey: ['feed'] });
      if (groupId) qc.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast.success('Posted!');
    },
    onError: () => toast.error('Failed to post'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex gap-3">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}`}
          alt={user?.username}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full resize-none bg-transparent border-none outline-none text-base placeholder-gray-400"
          />
          {files.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  {f.type.startsWith('video/') ? (
                    <video src={URL.createObjectURL(f)} className="h-20 w-20 object-cover rounded-lg" muted />
                  ) : (
                    <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 object-cover rounded-lg" />
                  )}
                  <button
                    type="button"
                    onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="text-brand-500 hover:text-brand-700 text-sm font-medium"
            >
              📷 Photo/Video
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 4))}
            />
            <button
              type="submit"
              disabled={isPending || (!content.trim() && files.length === 0)}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-semibold"
            >
              {isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
