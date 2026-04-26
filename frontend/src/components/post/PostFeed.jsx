import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
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

  const parentRef = useRef(null);

  const virtualizer = useWindowVirtualizer({
    count: hasNextPage ? posts.length + 1 : posts.length,
    estimateSize: () => 400, // Estimated height of a post
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...items].reverse();
    if (!lastItem) return;

    if (lastItem.index >= posts.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, posts.length, isFetchingNextPage, items]);

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
    <div
      ref={parentRef}
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {items.map((virtualRow) => {
        const isLoaderRow = virtualRow.index > posts.length - 1;
        const post = posts[virtualRow.index];

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="pb-2">
              {isLoaderRow ? (
                <div className="p-4 text-center text-brand-600 font-bold">
                  Loading more posts...
                </div>
              ) : (
                <PostCard post={post} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
