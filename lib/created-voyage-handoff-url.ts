import type { CreatedVoyage } from "@/lib/created-voyages";

const CHUNK = 1500;
/** Sous la limite pratique d’URL (navigateurs / proxies) pour une seule requête. */
export const URL_SINGLE_MAX = 2000;

/** Retire le lourd (géo / legs) : récupérable côté fiche (Mapbox) si besoin. */
export function compactCreatedVoyageForHandoff(cv: CreatedVoyage): CreatedVoyage {
  return {
    ...cv,
    routeGeometry: null,
    legs: undefined,
  };
}

function utf8ToBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToUtf8(b64: string): string {
  const pad = b64.length % 4;
  const b64p = b64 + (pad ? "=".repeat(4 - pad) : "");
  const standard = b64p.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(standard);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeCreatedVoyageToHandoffB64(cv: CreatedVoyage): string {
  return utf8ToBase64Url(JSON.stringify(compactCreatedVoyageForHandoff(cv)));
}

export function decodeHandoffB64ToCreatedVoyage(b64: string): CreatedVoyage | null {
  try {
    const text = base64UrlToUtf8(b64.trim());
    const o = JSON.parse(text) as CreatedVoyage;
    if (typeof o.id !== "string" || !Array.isArray(o.steps)) return null;
    return o;
  } catch {
    return null;
  }
}

const MAX_URL_SAFE = 7200;

/**
 * Construit le chemin + query pour router.push. Découpe en v0, v1… si besoin.
 * Si l’URL dépasse une limite prudente (proxies / WebView), retourne la seule base
 * (les filets handoff / storage prennent le relais).
 */
export function buildMonEspaceVoyageHandoffPath(voyageId: string, b64: string): string {
  const base = `/mon-espace/voyage/${encodeURIComponent(voyageId)}`;
  if (b64.length <= URL_SINGLE_MAX) {
    const p = `${base}?v=${encodeURIComponent(b64)}`;
    return p.length <= MAX_URL_SAFE ? p : base;
  }
  const params = new URLSearchParams();
  for (let i = 0, o = 0; o < b64.length; i++, o += CHUNK) {
    const chunk = b64.slice(o, o + CHUNK);
    params.set(`v${i}`, chunk);
  }
  const q = params.toString();
  const out = q ? `${base}?${q}` : base;
  return out.length <= MAX_URL_SAFE ? out : base;
}

/**
 * Depuis l’URL courante (search), sans dépendre de useSearchParams.
 */
export function readCreatedVoyageFromHandoffUrl(): { voyage: CreatedVoyage; stripQuery: true } | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const single = sp.get("v");
  if (single) {
    const v = decodeHandoffB64ToCreatedVoyage(single);
    return v ? { voyage: v, stripQuery: true } : null;
  }
  const parts: string[] = [];
  for (let i = 0; i < 64; i++) {
    const k = `v${i}`;
    if (!sp.has(k)) break;
    parts.push(sp.get(k) ?? "");
  }
  if (parts.length === 0) return null;
  const v = decodeHandoffB64ToCreatedVoyage(parts.join(""));
  return v ? { voyage: v, stripQuery: true } : null;
}

/**
 * Enlève ?v= / ?v0=… de la barre d’adresse (sans recharger).
 */
export function stripHandoffFromAddressBar(voyageId: string): void {
  if (typeof window === "undefined") return;
  const path = `/mon-espace/voyage/${encodeURIComponent(voyageId)}`;
  if (window.location.pathname === path) {
    window.history.replaceState({}, "", path);
  }
}
