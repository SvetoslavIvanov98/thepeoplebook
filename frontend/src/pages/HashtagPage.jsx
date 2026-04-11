import { useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../services/api';
import PostCard from '../components/post/PostCard';

export default function HashtagPage() {
  const { tag } = useParams();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['hashtag', tag],
    queryFn: ({ pageParam }) =>
      api
        .get(`/posts/hashtag/${encodeURIComponent(tag)}`, pageParam ? { params: { cursor: pageParam } } : undefined)
        .then((r) => r.data),
    getNextPageParam: (lastPage) => {
      if (!lastPage.length) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    initialPageParam: undefined,
  });

  const posts = data?.pages.flat() ?? [];

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">#{tag}</h1>
        <p className="text-xs text-gray-400">{posts.length} posts</p>
      </header>

      {isFetching && !isFetchingNextPage && (
        <div className="p-4 text-center text-gray-400 text-sm">Loading…</div>
      )}

      {!isFetching && posts.length === 0 && (
        <div className="p-8 text-center text-gray-400">No posts with #{tag} yet.</div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <div className="p-4 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-brand-500 hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
