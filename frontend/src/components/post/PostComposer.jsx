import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Image } from 'lucide-react';

export default function PostComposer({ groupId = null }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const fileRef = useRef();
  const user = useAuthStore((s) => s.user);
  const [isFocused, setIsFocused] = useState(false);
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
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to post'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    mutate();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`p-6 mb-8 bg-white/70 dark:bg-black/30 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 transition-all duration-300 ${isFocused ? 'shadow-xl ring-2 ring-brand-400 dark:ring-brand-500 scale-[1.01]' : 'shadow-lg'}`}
    >
      <div className="flex gap-4">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}`}
          alt={user?.username}
          className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What's on your mind?"
            rows={content.length > 50 || isFocused ? 3 : 1}
            className="w-full resize-none bg-transparent border-none outline-none text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 mt-2"
          />

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-3 flex-wrap mt-3"
              >
                {files.map((f, i) => (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    key={i}
                    className="relative group"
                  >
                    {f.type.startsWith('video/') ? (
                      <video
                        src={URL.createObjectURL(f)}
                        className="h-24 w-24 object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        muted
                      />
                    ) : (
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="h-24 w-24 object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* File input always in DOM so onChange fires even when toolbar is hidden */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 4))}
          />

          <AnimatePresence>
            {(isFocused || content.length > 0 || files.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Image className="w-5 h-5" /> Photo/Video
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isPending || (!content.trim() && files.length === 0)}
                  className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 shadow-sm hover:shadow disabled:opacity-50 disabled:hover:scale-100 text-white px-6 py-2 rounded-full text-sm font-bold transition-all"
                >
                  {isPending ? 'Posting…' : 'Post'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.form>
  );
}
