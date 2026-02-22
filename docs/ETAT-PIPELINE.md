# État du pipeline — Lieux central

Dernière mise à jour : 19 février 2025

---

## Où on en est

| Étape | Statut | Fichier / action |
|-------|--------|------------------|
| **1. Batch Phase 1** | ✅ Terminé | `batch_output.jsonl` (96 départements) |
| **2a. Créer Excel vide** | ✅ Terminé | `lieux-central.xlsx` créé (3 onglets, en-têtes) |
| **2b. Process** | 🔄 En cours | Remplit Excel (patrimoine, plages, randos Overpass) |
| **3. Enrichissement** | ⏳ En attente | Mapbox, INSEE, Wikipedia |
| **4. Descriptions villes** | À venir | Batches Top 100, etc. |

---

## Commandes par étape

### Si Process (2b) s’arrête avant la fin

```bash
# Reprendre à partir du département 17 par exemple
npx tsx scripts/process-batch-results.ts --from=17

# Sans justifications GPT randos (à faire en batch plus tard)
npx tsx scripts/process-batch-results.ts --from=13 --no-rando-justifications
```

### Étape 3 — Enrichissement (après Process terminé)

```bash
npx tsx scripts/enrich-lieux-central.ts
```

Ou via la page **Maintenance → Avancement des batches** : bouton « Lancer enrichissement ».

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `data/batch/batch_output.jsonl` | Résultats OpenAI (96 lignes = 96 départements) |
| `data/cities/lieux-central.xlsx` | Excel final (Patrimoine, Plages, Randos) |
| `data/cities/geocode-cache-lieux.json` | Cache Mapbox (créé par enrichissement) |
| `data/cities/.enrich-progress.json` | Progression enrichissement (temporaire) |

---

## Ordre des scripts (référence)

```
1. create-lieux-central-xlsx.ts  ← Créer Excel vide (une fois)
2. process-batch-results.ts      ← Remplir avec batch + Overpass
3. enrich-lieux-central.ts       ← Mapbox, INSEE, Wikipedia
```
