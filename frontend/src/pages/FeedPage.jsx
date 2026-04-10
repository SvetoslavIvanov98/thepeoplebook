import PostComposer from '../components/post/PostComposer';
import PostFeed from '../components/post/PostFeed';

export default function FeedPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">Home</h1>
      </header>
      <PostComposer />
      <PostFeed />
    </div>
  );
}
