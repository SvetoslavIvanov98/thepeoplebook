export function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />;
}

export function PostSkeleton() {
  return (
    <div className="p-6 mb-4 bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-[2rem] border border-white/30 dark:border-white/5 shadow-soft">
      <div className="flex gap-4 items-start">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-4 py-1">
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
      <div className="flex gap-6 mt-6 ml-16">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}
