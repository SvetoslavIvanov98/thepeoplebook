import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PostCard from './PostCard';
import { PostSkeleton } from '../Skeleton';

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

  if (isPending)
    return (
      <div className="flex flex-col gap-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  if (!posts.length)
    return (
      <div className="p-8 text-center text-gray-400">
        No posts yet. Follow people to see their posts!
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full p-4 mb-8 bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/5 text-brand-600 hover:text-brand-700 hover:shadow-lg dark:hover:text-brand-400 font-bold transition-all duration-300 hover:scale-[1.02]"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
