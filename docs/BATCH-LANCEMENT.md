# Procédure de lancement du batch Phase 1

Documentation pour lancer le batch patrimoine + plages sur les 96 départements métropolitains.

**Important** : la limite OpenAI est 90 000 enqueued tokens pour gpt-4o. On découpe en **4 lots** (~24 départements chacun) et on les soumet **un par un** (attendre « completed » avant le suivant).

---

## Prérequis

- **Node.js** (v18+) et `npx tsx`
- **OPENAI_API_KEY** dans `.env.local`
- Fichiers : `classement.json`, `profils-cotiers.json`, `profils-randos.json`, `plus-beaux-villages.json`

---

## Marche à suivre

### Étape 1 — Préparer les 4 lots

```bash
npx tsx scripts/prepare-batch-jsonl.ts --split=4
```

**Sortie** : `batch_part1.jsonl`, `batch_part2.jsonl`, `batch_part3.jsonl`, `batch_part4.jsonl` (~24 requêtes chacun)

---

### Étape 2 — Soumettre le lot 1

```bash
npx tsx scripts/submit-batch.ts 1
```

Surveille sur **https://platform.openai.com/batches**. Attendre que le statut soit **completed** (souvent quelques heures, jusqu’à ~24 h).

---

### Étape 3 — Soumettre le lot 2 (une fois le lot 1 terminé)

```bash
npx tsx scripts/submit-batch.ts 2
```

Attendre **completed**, puis passer au lot 3, etc.

---

### Étape 4 — Vérifier le statut (optionnel)

```bash
npx tsx scripts/check-batch-status.ts
```

Affiche le statut de tous les lots pour lesquels un batch a été soumis.

---

### Étape 5 — Télécharger et fusionner les résultats

Quand **tous** les lots sont **completed** :

```bash
npx tsx scripts/download-batch-results.ts
```

Sans argument, télécharge tous les lots et les fusionne dans `batch_output.jsonl`.

Pour un seul lot : `npx tsx scripts/download-batch-results.ts 1`

---

### Étape 6 — Traiter les résultats

```bash
npx tsx scripts/process-batch-results.ts
```

Parse, fusionne PBVF, Overpass randos, justifications GPT, écrit `lieux-central.xlsx`.

**Prérequis** : `npx tsx scripts/create-lieux-central-xlsx.ts` si le fichier n’existe pas.

---

### Étape 7 — Enrichissement

```bash
npx tsx scripts/enrich-lieux-central.ts
```

---

## Ordre des commandes (résumé)

```
1. npx tsx scripts/prepare-batch-jsonl.ts --split=4
2. npx tsx scripts/submit-batch.ts 1
   → Attendre "completed" sur platform.openai.com/batches
3. npx tsx scripts/submit-batch.ts 2
   → Attendre "completed"
4. npx tsx scripts/submit-batch.ts 3
   → Attendre "completed"
5. npx tsx scripts/submit-batch.ts 4
   → Attendre "completed"
6. npx tsx scripts/download-batch-results.ts
7. npx tsx scripts/process-batch-results.ts
8. npx tsx scripts/enrich-lieux-central.ts
```

---

## Fichiers batch

| Fichier | Rôle |
|---------|------|
| `batch_part1.jsonl` … `batch_part4.jsonl` | Inputs (lots) |
| `batch_id_part1.txt` … | ID de chaque batch soumis |
| `batch_output.jsonl` | Résultats fusionnés |
| `batch_output_part1.jsonl` … | Résultat d’un lot (si téléchargé séparément) |

---

## Dépannage

### « Enqueued token limit reached »

Le batch dépasse 90k tokens. Utiliser `--split=4` (ou plus).

### Le batch est en `failed`

Vérifier le format JSONL et l’`error_file_id` sur platform.openai.com.

### Suivre l’avancement

👉 **https://platform.openai.com/batches**

---

## Références

- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch)
- `docs/BATCH-FORMAT-JSONL.md`
- `docs/RECAP-DECISIONS-DATA-BATCH.md`
