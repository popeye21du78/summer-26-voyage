import {
  addFavorite,
  listFavorites,
  removeFavorite,
  type FavoriteKind,
  type FavoriteStatus,
} from "@/lib/planifier-favorites";

export function isFavoriteKind(kind: FavoriteKind, refId: string): boolean {
  return listFavorites().some((f) => f.kind === kind && f.refId === refId);
}

export function toggleFavoriteKind(
  kind: FavoriteKind,
  refId: string,
  label: string,
  status: FavoriteStatus = "inspiration",
  meta?: Record<string, unknown>
): boolean {
  const existing = listFavorites().find((f) => f.kind === kind && f.refId === refId);
  if (existing) {
    removeFavorite(existing.id);
    return false;
  }
  addFavorite({ kind, status, label, refId, meta });
  return true;
}
