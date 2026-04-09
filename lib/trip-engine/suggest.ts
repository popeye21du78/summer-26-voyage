import { getTerritoryById } from "@/lib/editorial-territories";
import { anchorsForRegion } from "./region-anchors";
import type {
  NightBase,
  PlaceDiagnostic,
  PlaceDiagnosticLevel,
  StructureOption,
  SuggestInput,
  SuggestResponse,
} from "./types";

function computeNights(days: number): number {
  if (days <= 1) return 1;
  return Math.max(1, days - 1);
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function splitNights(total: number, parts: number, minEach = 1): number[] {
  if (parts <= 0) return [total];
  if (parts === 1) return [total];
  const minTotal = parts * minEach;
  if (total < minTotal) {
    const base = Math.floor(total / parts);
    return Array.from({ length: parts }, (_, i) => base + (i < total - base * parts ? 1 : 0));
  }
  const out = Array.from({ length: parts }, () => minEach);
  let remaining = total - minTotal;
  let i = 0;
  while (remaining > 0) {
    out[i % parts]++;
    remaining--;
    i++;
  }
  return out;
}

function mockEnrichments(bases: NightBase[]): StructureOption["enrichments"] {
  const out: NonNullable<StructureOption["enrichments"]> = [];
  for (let i = 0; i < bases.length; i++) {
    out.push({
      segmentIndex: i,
      label:
        i === 0
          ? `Journées autour de ${bases[i].name}`
          : `Transit vers ${bases[i].name}`,
      pois: [
        {
          name: `Découverte locale (${bases[i].name})`,
          reason: "Sélectionnée pour faible détour et adéquation au rythme.",
        },
        {
          name: "Point de vue ou village voisin",
          reason: "Enrichissement léger sans alourdir la route.",
        },
      ],
    });
  }
  return out;
}

function buildStructure(
  id: string,
  label: string,
  mobility: string,
  bases: NightBase[],
  explanations: string[],
  withEnrich: boolean
): StructureOption {
  return {
    id,
    label,
    mobility,
    bases,
    explanations,
    enrichments: withEnrich ? mockEnrichments(bases) : undefined,
  };
}

function zoneStructures(input: SuggestInput): StructureOption[] {
  const nights = computeNights(input.days);
  const region = input.regionKey ?? "default";
  const anchors = anchorsForRegion(region);
  const territory = input.territoryId
    ? getTerritoryById(input.territoryId)
    : undefined;
  const tHint = territory?.name;

  const paceNote =
    input.pace === "tranquille"
      ? "rythme reposant, moins de kilomètres par jour"
      : input.pace === "soutenu"
        ? "rythme dense, plus d’étapes par journée"
        : "rythme équilibré";

  const prio =
    input.priorities.length > 0
      ? `priorités : ${input.priorities.join(", ")}`
      : "priorités générales";

  if (input.tripForm === "base_fixe") {
    const hub = anchors[0];
    const bases: NightBase[] = [
      { name: hub.name, lat: hub.lat, lng: hub.lng, nights },
    ];
    return [
      buildStructure(
        "zone-base-fixe",
        "Base fixe + excursions",
        "Une seule base, journées en étoile",
        bases,
        [
          tHint
            ? `Enveloppe inspirée du territoire « ${tHint} ».`
            : `Zone ${region} : on concentre les nuits pour limiter les déplacements.`,
          `Structure adaptée à un ${paceNote} (${prio}).`,
          "Les visites sont réparties autour de la base sans changer de logement chaque nuit.",
        ],
        true
      ),
    ];
  }

  if (input.tripForm === "multi_bases") {
    const nBases = Math.min(3, Math.max(2, Math.ceil(nights / 4)));
    const picks = anchors.slice(0, nBases);
    while (picks.length < nBases) picks.push(anchors[picks.length % anchors.length]);
    const alloc = splitNights(nights, nBases);
    const bases: NightBase[] = picks.map((c, i) => ({
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      nights: alloc[i] ?? 1,
    }));
    return [
      buildStructure(
        "zone-multi",
        "Multi-bases équilibrée",
        `${nBases} bases, enchaînement logique`,
        bases,
        [
          tHint
            ? `Bassins choisis pour rester cohérents avec « ${tHint} ».`
            : "Plusieurs étapes pour couvrir la zone sans excès de route.",
          `Nuits réparties selon la densité probable de visites (${paceNote}).`,
        ],
        true
      ),
    ];
  }

  if (input.tripForm === "mobile") {
    const nBases = Math.min(nights, Math.max(3, Math.ceil(nights / 2)));
    const picks: typeof anchors = [];
    for (let i = 0; i < nBases; i++) picks.push(anchors[i % anchors.length]);
    const alloc = splitNights(nights, nBases, 1);
    const bases: NightBase[] = picks.map((c, i) => ({
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      nights: alloc[i] ?? 1,
    }));
    return [
      buildStructure(
        "zone-mobile",
        "Itinéraire mobile",
        "Nuits régulières, progression dans la zone",
        bases,
        [
          "Parcours type road trip avec étapes courtes.",
          `Ajusté pour un ${paceNote}.`,
        ],
        true
      ),
    ];
  }

  /* options : 2–4 propositions */
  const compactAlloc = splitNights(nights, 2);
  const basesCompact: NightBase[] = [
    {
      name: anchors[0].name,
      lat: anchors[0].lat,
      lng: anchors[0].lng,
      nights: compactAlloc[0] ?? Math.ceil(nights / 2),
    },
    {
      name: anchors[1]?.name ?? anchors[0].name,
      lat: anchors[1]?.lat ?? anchors[0].lat,
      lng: anchors[1]?.lng ?? anchors[0].lng,
      nights: compactAlloc[1] ?? Math.floor(nights / 2),
    },
  ];

  const wideParts = Math.min(3, Math.max(2, Math.ceil(nights / 5)));
  const wideAlloc = splitNights(nights, wideParts);
  const basesWide: NightBase[] = anchors.slice(0, wideParts).map((c, i) => ({
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    nights: wideAlloc[i] ?? 1,
  }));

  return [
    buildStructure(
      "opt-compacte",
      "Structure compacte",
      "Peu de bases, rayons larges",
      basesCompact,
      [
        "Moins de changements de logement, trajets journaliers un peu plus longs.",
        prio + ".",
      ],
      false
    ),
    buildStructure(
      "opt-equilibre",
      "Structure équilibrée",
      "2 à 3 bases, compromis route / découvertes",
      basesWide,
      [
        "Bon compromis pour découvrir plusieurs bassins sans fatigue excessive.",
        tHint ? `Cohérent avec l’esprit « ${tHint} ».` : "",
      ].filter(Boolean),
      false
    ),
    buildStructure(
      "opt-base-fixe",
      "Base fixe confort",
      "Une base, confort de planification",
      [
        {
          name: anchors[Math.min(1, anchors.length - 1)].name,
          lat: anchors[Math.min(1, anchors.length - 1)].lat,
          lng: anchors[Math.min(1, anchors.length - 1)].lng,
          nights,
        },
      ],
      [
        "Priorité au confort : une seule adresse, excursions à la journée.",
        input.conflictPriority === "confort"
          ? "Renforcé car tu as choisi la priorité « confort »."
          : "",
      ].filter(Boolean),
      false
    ),
  ];
}

function axisStructures(input: SuggestInput): StructureOption[] {
  const ax = input.axis;
  if (!ax) return zoneStructures(input);
  const nights = computeNights(input.days);
  const mid = {
    lat: (ax.startLat + ax.endLat) / 2,
    lng: (ax.startLng + ax.endLng) / 2,
  };
  const dist = haversineKm(
    { lat: ax.startLat, lng: ax.startLng },
    { lat: ax.endLat, lng: ax.endLng }
  );

  const corridorHint =
    ax.corridorVariant ??
    (ax.corridorTendency === "direct"
      ? "corridor serré"
      : ax.corridorTendency === "grands_detours"
        ? "corridor large"
        : "corridor modéré");

  const lateral =
    ax.lateral === "littoral"
      ? "favorisant le littoral"
      : ax.lateral === "interieur"
        ? "plus tourné intérieur"
        : ax.lateral === "relief"
          ? "avec détours de relief"
          : "";

  if (nights <= 2) {
    const bases: NightBase[] = [
      {
        name: ax.startLabel,
        lat: ax.startLat,
        lng: ax.startLng,
        nights: 1,
      },
      {
        name: ax.endLabel,
        lat: ax.endLat,
        lng: ax.endLng,
        nights: Math.max(1, nights - 1),
      },
    ];
    return [
      buildStructure(
        "axe-court",
        "Trajet direct",
        `${corridorHint} ${lateral}`.trim(),
        bases,
        [
          `Environ ${Math.round(dist)} km entre les deux extrémités.`,
          "Structure minimale adaptée à une durée courte.",
        ],
        true
      ),
    ];
  }

  const alloc3 = splitNights(nights, 3);
  const bases3: NightBase[] = [
    {
      name: ax.startLabel,
      lat: ax.startLat,
      lng: ax.startLng,
      nights: alloc3[0] ?? 1,
    },
    {
      name: "Étape centrale",
      lat: mid.lat,
      lng: mid.lng,
      nights: alloc3[1] ?? 1,
    },
    {
      name: ax.endLabel,
      lat: ax.endLat,
      lng: ax.endLng,
      nights: alloc3[2] ?? 1,
    },
  ];

  const alloc2 = splitNights(nights, 2);
  const bases2: NightBase[] = [
    {
      name: ax.startLabel,
      lat: ax.startLat,
      lng: ax.startLng,
      nights: alloc2[0] ?? 1,
    },
    {
      name: ax.endLabel,
      lat: ax.endLat,
      lng: ax.endLng,
      nights: alloc2[1] ?? 1,
    },
  ];

  return [
    buildStructure(
      "axe-lent",
      "Version lente",
      `${corridorHint}, temps laissé sur l’axe`,
      bases3,
      [
        `Distance brute ~${Math.round(dist)} km ; version décomposed en 3 temps forts.`,
        lateral,
        ax.routeVsDiscovery === "moins_route"
          ? "Poids sur la réduction des détours entre les nuits."
          : "",
      ].filter(Boolean),
      true
    ),
    buildStructure(
      "axe-equilibre",
      "Version équilibrée",
      "Deux grands camps sur l’axe",
      bases2,
      [
        "Moins de nuits intermédiaires, journées un peu plus chargées.",
        corridorHint + ".",
      ],
      true
    ),
    buildStructure(
      "axe-dense",
      "Version dense",
      "Progression rapide, nuits plus courtes par étape",
      (() => {
        const nParts = Math.min(4, Math.max(3, Math.ceil(nights / 2)));
        const alloc = splitNights(nights, nParts);
        return alloc.map((n, i) => {
          const t = nParts <= 1 ? 0 : i / (nParts - 1);
          return {
            name:
              i === 0
                ? ax.startLabel
                : i === nParts - 1
                  ? ax.endLabel
                  : `Étape ${i + 1}`,
            lat: ax.startLat + (ax.endLat - ax.startLat) * t,
            lng: ax.startLng + (ax.endLng - ax.startLng) * t,
            nights: n,
          };
        });
      })(),
      [
        "Pour maximiser les lieux vus si tu acceptes plus de conduite.",
        dist > 400 ? "Longue distance : cette version reste exigeante." : "",
      ].filter(Boolean),
      true
    ),
  ];
}

function placesStructures(input: SuggestInput): StructureOption[] {
  const places = input.places ?? [];
  const nights = computeNights(input.days);
  const hard = places.filter((p) => p.weight === "hard");
  const ordered =
    hard.length > 0
      ? [...hard, ...places.filter((p) => p.weight !== "hard")]
      : places;

  if (ordered.length === 0) return zoneStructures(input);

  const nBases = Math.min(4, ordered.length);
  const picks = ordered.slice(0, nBases);
  const alloc = splitNights(nights, nBases);
  const bases: NightBase[] = picks.map((p, i) => ({
    name: p.label,
    lat: p.lat,
    lng: p.lng,
    nights: alloc[i] ?? 1,
  }));

  return [
    buildStructure(
      "lieux-optim",
      "Optimisé autour des indispensables",
      "Ordre guidé par tes lieux prioritaires",
      bases,
      [
        "Les lieux « indispensables » structurent l’ordre des nuits.",
        "Les autres visites peuvent s’insérer en enrichissement local.",
      ],
      true
    ),
  ];
}

export function suggestStructures(input: SuggestInput): SuggestResponse {
  if (input.mode === "axis") {
    return {
      structures: axisStructures(input),
      meta: { corridorLabel: input.axis?.corridorTendency },
    };
  }
  if (input.mode === "places") {
    return { structures: placesStructures(input) };
  }
  const territory = input.territoryId
    ? getTerritoryById(input.territoryId)
    : undefined;
  return {
    structures: zoneStructures(input),
    meta: { territoryHint: territory?.name },
  };
}

function diagnosticLevel(
  spanKm: number,
  days: number,
  nHard: number,
  nTotal: number
): PlaceDiagnosticLevel {
  const minDaysLoose = nHard * 1.2 + Math.max(0, nTotal - nHard) * 0.5;
  const minDaysTight = nHard * 2 + Math.max(0, nTotal - nHard) * 0.9;

  if (spanKm > 900 && days < 10) return "deux_voyages";
  if (spanKm > 600 && days < 8) return "ambitieux";
  if (days < minDaysTight && nTotal >= 3) return "compromis";
  if (days < minDaysLoose) return "compromis";
  return "faisable";
}

export function diagnosePlaces(input: {
  days: number;
  places: SuggestInput["places"];
}): PlaceDiagnostic {
  const places = input.places ?? [];
  if (places.length === 0) {
    return {
      level: "faisable",
      title: "Ajoute des lieux",
      detail: "Aucun lieu saisi pour l’instant.",
      suggestedActions: [{ id: "add", label: "Ajouter des lieux sur la carte" }],
    };
  }

  let maxSpan = 0;
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      maxSpan = Math.max(
        maxSpan,
        haversineKm(
          { lat: places[i].lat, lng: places[i].lng },
          { lat: places[j].lat, lng: places[j].lng }
        )
      );
    }
  }

  const nHard = places.filter((p) => p.weight === "hard").length;
  const level = diagnosticLevel(maxSpan, input.days, nHard, places.length);

  const actions: { id: string; label: string }[] = [
    { id: "optimiser", label: "Optimiser autour des indispensables" },
    { id: "densifier", label: "Rythme plus dense pour garder plus de lieux" },
    { id: "scinder", label: "Scinder en deux voyages" },
    { id: "enrichir", label: "Créer des enrichissements entre les étapes" },
  ];

  if (level === "deux_voyages") {
    return {
      level,
      title: "Mieux en deux voyages",
      detail: `Les lieux sont très éloignés (~${Math.round(maxSpan)} km d’envergure) pour ${input.days} jours. Envisager deux séjours ou un long road trip.`,
      suggestedActions: actions,
    };
  }
  if (level === "ambitieux") {
    return {
      level,
      title: "Ambitieux",
      detail: `Grande dispersion (~${Math.round(maxSpan)} km). Faisable avec un rythme soutenu et peu de temps par site.`,
      suggestedActions: actions,
    };
  }
  if (level === "compromis") {
    return {
      level,
      title: "Faisable avec compromis",
      detail:
        "Le temps disponible est juste par rapport au nombre de lieux. Il faudra prioriser ou allonger le séjour.",
      suggestedActions: actions,
    };
  }
  return {
    level: "faisable",
    title: "Faisable",
    detail:
      "Dispersion et durée semblent cohérentes. Tu peux affiner avec le moteur de structures.",
    suggestedActions: actions.slice(0, 3),
  };
}
