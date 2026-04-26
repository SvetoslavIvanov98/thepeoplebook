import { create } from 'zustand';

export const useLightboxStore = create((set) => ({
  isOpen: false,
  post: null,
  index: 0,
  items: [],
  openLightbox: (post, index, items) => set({ isOpen: true, post, index, items }),
  closeLightbox: () => set({ isOpen: false, post: null, index: 0, items: [] }),
  setIndex: (index) => set({ index }),
}));
