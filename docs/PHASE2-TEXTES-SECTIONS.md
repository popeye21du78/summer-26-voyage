# Phase 2 – Sections texte par ville

Document de référence pour les sections « à la carte » générées par OpenAI au clic.

---

## Fichier des prompts

**`lib/city-prompts.ts`** – Tous les prompts, le modèle OpenAI et le ton sont définis ici.  
Pour modifier le ton, les instructions ou passer à un autre modèle, édite ce fichier.

---

## Architecture

- **Table** : `city_sections` – `step_id`, `section_type`, `content`, `place_rating`
- **Personnalité** : « Copilote Cultivé » (prompt système)
- **Génération** : au clic sur l’accordéon, diagnostic (1–4) puis génération, stockage en DB
- **Modèle** : `gpt-4o-mini` (configurable dans `lib/city-prompts.ts`)

---

## Les 5 sections

| # | Type | Nom |
|---|------|-----|
| 1 | `atmosphere` | Atmosphère & Vibe |
| 2 | `chroniques` | Chroniques du Temps |
| 3 | `guide_epicurien` | Le Guide Épicurien |
| 4 | `radar_van` | Radar Van-Life |
| 5 | `anecdote` | L'Anecdote ou Le Secret |

---

*Implémenté – Phase 2 complète.*
