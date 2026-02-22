# Récap des décisions — Data, batch et fiches villes

**Date** : février 2026  
**Objectif** : Enregistrer tout le travail effectué avant la génération des doc nécessaires au lancement du batch Phase 1.

---

## 1. Vue d'ensemble du plan

| Phase | Objectif | Mode |
|-------|----------|------|
| **Phase 1** | Carte lieux : patrimoine + plages + randos pour 97 départements | **Batch API** (patrimoine+plages) |
| **Phase 2** | Enrichissement Mapbox + INSEE + Wikipedia | Post-batch (intégré) |
| **Phase 3** | Top 100 villes → fiches complètes | Batch |
| **Phase 4** | Villes plus petites / autres lieux → fiches simplifiées | Batch (prompt adapté) |

---

## 2. Phase 1 — Batch patrimoine + plages

### Décision : oui au batch

Le batch API OpenAI est adopté pour la Phase 1. Il permet :
- Réduction des coûts (jusqu’à ~50 % vs appels sync)
- Traitement massif en une seule soumission

### Contraintes techniques

- **Patrimoine + plages** : 1 appel GPT par département → batchable ✅
- **Randos** : Overpass (OSM), pas GPT → à exécuter en parallèle ou après
- **Justifications randos** : GPT → batchable ou sync (97 petits appels rapides)
- **Enrichissement** : Mapbox / INSEE / Wikipedia → post-batch

### Flux batch (ce qui va se passer)

1. **Préparation** : générer 97 prompts (un par département) → fichier JSONL
2. **Soumission** : upload JSONL → créer batch job → récupérer `batch_id`
3. **Attente** : ~24 h (OpenAI traite en asynchrone)
4. **Récupération** : télécharger le JSONL des réponses
5. **Traitement** : parser, merger PBVF + patrimoine GPT, exécuter Overpass pour randos
6. **Justifications randos** : batch 2 ou appels sync
7. **Écriture Excel** : `lieux-central.xlsx` avec Patrimoine, Plages, Randos
8. **Enrichissement** : geocode Mapbox, INSEE, Wikipedia → ré-écriture Excel

---

## 3. Deux classements départementaux indépendants

### `classement.json` — Patrimoine (tier global)

- **Tier** : S, A, B, C, D
- **Utilisation** : `nbPatrimoine`, `nbPepitesMin` via `TIER_EFFECTIFS`
- Exemple : Cantal = tier B → 15 lieux patrimoine, 3 pépites min

### `profils-randos.json` — Randos (par département)

- **Champs** : `tier_rando`, `nb_randos` (0 à 12), `type_rando`, `denivele_typique`, `justification`
- **Utilisation** : `nbRandos` = nombre de randos à inclure (Overpass)
- Exemple : Cantal = tier_rando A, **10 randos** (volcans, relief montagnard)

**Important** : Un département tier B en patrimoine peut avoir **beaucoup de randos** (ex. Cantal : 10 randos, tier A rando). Les deux classements sont décorrélés.

---

## 4. PBVF (Plus Beaux Villages de France)

**Confirmé** : les PBVF arrivent **automatiquement**.

- **Source** : `data/plus-beaux-villages.json` (nom + `code_insee`)
- **Logique** : `loadPbvfForDepartment(codeDep)` filtre par département
- **Injection** : PBVF injectés en priorité avec score 8–10 (`clampPbvfScore`)
- **GPT** : reçoit la liste des PBVF, produit le reste du patrimoine (hors PBVF) + scores PBVF dans `patrimoine_pbvf`

---

## 5. Top 100 — Règles

- **Critère** : population (les pires villes peuvent ne pas être classées)
- **Exclusions** :
  - Petite couronne Paris : 92 (Hauts-de-Seine), 93 (Seine-Saint-Denis), 94 (Val-de-Marne)
  - DOM-TOM : exclus
- **Périmètre** : 97 départements métropolitains (01–95 + 2A, 2B)

---

## 6. Prompt fiches villes — Structure cible

### Top 100 (fiches complètes)

- Prompt existant : `docs/prompt-ville-api.md`
- Sections, ton, placeholders (profil, genre, etc.)

### Villes plus petites / autres lieux (prompt simplifié)

**Sections** :
1. **Histoire** (1 section)
2. **Restaurants** (2 restos)
3. **Que faire**
4. **Anecdote**

**Contraintes** :
- Pas de contrainte de longueur
- Adapter le prompt si lieu = château, abbaye, etc. (histoire du monument, visite, horaires, etc.)

---

## 7. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `data/departements/classement.json` | Tier patrimoine par département |
| `data/departements/profils-randos.json` | Tier rando + nb_randos par département |
| `data/departements/profils-cotiers.json` | Nb plages par département |
| `data/departements/tier-effectifs.ts` | nbPatrimoine, nbPepitesMin par tier |
| `data/plus-beaux-villages.json` | Source PBVF |
| `scripts/generate-departement.ts` | Génération sync actuelle (à adapter en batch) |
| `scripts/prompt-passe2.ts` | Prompt patrimoine + plages |
| `lib/profils-departement.ts` | Fusion classement + cotiers + randos |
| `data/cities/lieux-central.xlsx` | Données lieux (Patrimoine, Plages, Randos) |

---

## 8. Docs et scripts batch

| Doc / Script | Rôle |
|--------------|------|
| `docs/BATCH-LANCEMENT.md` | Procédure complète étape par étape |
| `docs/BATCH-FORMAT-JSONL.md` | Format technique du fichier JSONL |
| `scripts/prepare-batch-jsonl.ts` | Génère le fichier d'entrée (97 requêtes) |
| `scripts/submit-batch.ts` | Upload + création du batch |
| `scripts/check-batch-status.ts` | Vérifie le statut |
| `scripts/download-batch-results.ts` | Télécharge les résultats |
| `scripts/process-batch-results.ts` | Parse, Overpass randos, Excel |

---

*Mise à jour : février 2026 — docs et scripts batch prêts.*
