import PostComposer from '../components/post/PostComposer';
import PostFeed from '../components/post/PostFeed';

export default function FeedPage() {
  return (
    <div className="relative pt-[4.5rem]">
      <header className="absolute top-4 left-4 right-4 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-soft px-5 py-3 z-10 flex items-center justify-between">
        <h1 className="font-extrabold tracking-tight text-xl text-brand-700 dark:text-brand-300">
          Home
        </h1>
      </header>
      <div className="px-4 md:px-8">
        <PostComposer />
        <PostFeed />
      </div>
    </div>
  );
}
