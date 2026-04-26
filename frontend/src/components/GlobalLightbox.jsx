import { useLightboxStore } from '../store/lightbox.store';
import PostLightbox from './post/PostLightbox';
import { AnimatePresence } from 'framer-motion';

export default function GlobalLightbox() {
  const { isOpen, post, index, items, closeLightbox, setIndex } = useLightboxStore();

  return (
    <AnimatePresence>
      {isOpen && post && (
        <PostLightbox
          key={`global-lightbox-${post.id}`}
          post={post}
          index={index}
          items={items}
          onClose={closeLightbox}
          onNav={setIndex}
          // The actions will be handled by the PostCard logic if we re-trigger it, 
          // or we can pass them in the store. For now, let's just show the media.
        />
      )}
    </AnimatePresence>
  );
}
