import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import PostCard from '../components/post/PostCard';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => api.get('/search', { params: { q: submitted } }).then((r) => r.data),
    enabled: !!submitted,
  });

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, hashtags…"
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none"
          />
          <button type="submit" className="bg-brand-600 text-white rounded-full px-4 py-2 text-sm font-semibold">Search</button>
        </form>
      </header>

      {isFetching && <div className="p-4 text-center text-gray-400">Searching…</div>}

      {data && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.users?.length > 0 && (
            <section className="p-4">
              <h2 className="font-bold mb-3">People</h2>
              <div className="space-y-3">
                {data.users.map((u) => (
                  <Link key={u.id} to={`/${u.username}`} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2">
                    <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-sm">{u.full_name || u.username} {u.is_verified && <span className="text-brand-500">✓</span>}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.hashtags?.length > 0 && (
            <section className="p-4">
              <h2 className="font-bold mb-3">Hashtags</h2>
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag) => (
                  <Link key={tag} to={`/hashtag/${tag}`}
                    className="bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-full px-3 py-1 text-sm">
                    #{tag}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.posts?.length > 0 && (
            <section>
              <h2 className="font-bold p-4 pb-0">Posts</h2>
              {data.posts.map((p) => <PostCard key={p.id} post={p} />)}
            </section>
          )}

          {data.users?.length === 0 && data.posts?.length === 0 && (
            <div className="p-8 text-center text-gray-400">No results for "{submitted}"</div>
          )}
        </div>
      )}
    </div>
  );
}
