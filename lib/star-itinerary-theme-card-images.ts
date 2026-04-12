/**
 * Visuels pour les cartes « grand thème » (Unsplash, libres d’usage).
 * Choix stable par titre pour que le même thème garde la même image.
 */
const POOL = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f9?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80",
  "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
];

export function themeCardImageUrl(themeTitle: string): string {
  let h = 0;
  for (let i = 0; i < themeTitle.length; i++) {
    h = (h * 31 + themeTitle.charCodeAt(i)) | 0;
  }
  return POOL[Math.abs(h) % POOL.length];
}
