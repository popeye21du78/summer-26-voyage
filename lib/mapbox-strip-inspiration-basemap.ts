import type { Map as MapboxMap } from "mapbox-gl";

/**
 * Retire routes, labels, POI et frontières administratives du style Mapbox par défaut
 * pour ne garder qu’un fond terre / eau sobre (beige / class).
 * Ne touche pas aux couches listées dans `protectedLayerIds` (nos remplissages / contours).
 */
export function stripInspirationBasemapClutter(
  map: MapboxMap,
  protectedLayerIds: readonly string[]
): void {
  const protect = new Set(protectedLayerIds);
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (protect.has(layer.id)) continue;

    const { id, type } = layer;
    const lower = id.toLowerCase();

    try {
      if (type === "symbol" || type === "circle") {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }

      if (type === "line") {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }

      if (type === "fill-extrusion") {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }

      if (type === "fill") {
        if (
          lower.includes("building") ||
          lower.includes("structure") ||
          lower.includes("commercial") ||
          lower.includes("pitch") ||
          lower.includes("sport") ||
          lower.includes("landcover") ||
          lower.includes("landuse") ||
          lower.includes("national-park") ||
          lower.includes("park") ||
          lower.includes("wood") ||
          lower.includes("forest")
        ) {
          map.setLayoutProperty(id, "visibility", "none");
        }
        continue;
      }

      if (type === "raster") {
        if (lower.includes("hillshade") || lower.includes("satellite")) {
          map.setLayoutProperty(id, "visibility", "none");
        }
      }
    } catch {
      /* certains layers ne supportent pas visibility */
    }
  }
}
