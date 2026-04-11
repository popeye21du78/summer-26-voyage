const STORAGE_KEY = "planifier-favorites-v1";

export type FavoriteKind =
  | "territory"
  | "place"
  | "route_idea"
  /** Région carte inspiration (id MAP_REGIONS). */
  | "map_region"
  /** Itinéraire star (id content star-itineraries). */
  | "star_itinerary";

/** inspiration = simple envie ; soft = intégrer si possible ; hard = indispensable */
export type FavoriteStatus = "inspiration" | "soft" | "hard";

export type PlanifierFavorite = {
  id: string;
  kind: FavoriteKind;
  status: FavoriteStatus;
  label: string;
  refId: string;
  meta?: Record<string, unknown>;
  savedAt: string;
};

function readAll(): PlanifierFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const arr = JSON.parse(s) as PlanifierFavorite[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(items: PlanifierFavorite[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listFavorites(): PlanifierFavorite[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function addFavorite(entry: Omit<PlanifierFavorite, "id" | "savedAt">): PlanifierFavorite {
  const items = readAll();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `fav-${Date.now()}`;
  const row: PlanifierFavorite = {
    ...entry,
    id,
    savedAt: new Date().toISOString(),
  };
  writeAll([row, ...items.filter((x) => !(x.kind === row.kind && x.refId === row.refId))]);
  return row;
}

export function removeFavorite(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id));
}

export function updateFavoriteStatus(id: string, status: FavoriteStatus): void {
  writeAll(
    readAll().map((x) => (x.id === id ? { ...x, status } : x))
  );
}

export function getFavoritesForPrefill(): {
  territoryIds: string[];
  hardPlaceLabels: string[];
} {
  const items = readAll();
  return {
    territoryIds: items
      .filter((x) => x.kind === "territory" && (x.status === "hard" || x.status === "soft"))
      .map((x) => x.refId),
    hardPlaceLabels: items
      .filter((x) => x.kind === "place" && x.status === "hard")
      .map((x) => x.label),
  };
}
