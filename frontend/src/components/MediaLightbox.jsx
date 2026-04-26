import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Facebook-style lightbox for photos and videos.
 * Props:
 *   items   – array of URL strings (mixed images/videos)
 *   index   – currently visible index (null = closed)
 *   onClose – () => void
 *   onNav   – (newIndex) => void
 */
export default function MediaLightbox({ items = [], index, onClose, onNav }) {
  const isOpen = index !== null && index !== undefined;
  const url = isOpen ? items[index] : null;
  const isVideo = url && /\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(url);

  const prev = useCallback(() => {
    if (index > 0) onNav(index - 1);
  }, [index, onNav]);

  const next = useCallback(() => {
    if (index < items.length - 1) onNav(index + 1);
  }, [index, items.length, onNav]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, prev, next]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300 transition-colors z-10"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Counter */}
      {items.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 rounded-full px-3 py-1">
          {index + 1} / {items.length}
        </span>
      )}

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 hover:bg-black/70 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-10"
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      {/* Media */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            key={url}
            src={url}
            controls
            autoPlay
            muted
            playsInline
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl bg-black"
          />
        ) : (
          <img
            key={url}
            src={url}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Next arrow */}
      {index < items.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 hover:bg-black/70 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-10"
          aria-label="Next"
        >
          ›
        </button>
      )}

      {/* Thumbnail strip (when > 1 item) */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-2">
          {items.map((u, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onNav(i);
              }}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {/\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(u) ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xl">
                  ▶
                </div>
              ) : (
                <img src={u} alt="" className="w-full h-full object-cover" draggable={false} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
