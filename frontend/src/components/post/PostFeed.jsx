import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PostCard from './PostCard';

export default function PostFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      api.get('/posts/feed', { params: { cursor: pageParam, limit: 20 } }).then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.length === 20 ? lastPage[lastPage.length - 1].created_at : undefined,
    initialPageParam: undefined,
  });

  const posts = data?.pages.flat() || [];

  if (isPending) return <div className="p-4 text-center text-gray-400">Loading…</div>;
  if (!posts.length) return <div className="p-8 text-center text-gray-400">No posts yet. Follow people to see their posts!</div>;

  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full p-4 text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-900 text-sm font-medium"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
