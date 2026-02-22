# Format JSONL pour le batch Phase 1

Format du fichier d'entrée soumis à l'API Batch OpenAI pour la génération patrimoine + plages.

---

## Structure d'une ligne (requête)

Chaque ligne est un JSON valide avec les champs requis par l'API Batch :

```json
{
  "custom_id": "24",
  "method": "POST",
  "url": "/v1/chat/completions",
  "body": {
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "<prompt complet pour le département 24 (Dordogne)>"
      }
    ],
    "response_format": { "type": "json_object" },
    "max_tokens": 16000
  }
}
```

---

## Champs

| Champ | Valeur | Description |
|-------|--------|-------------|
| `custom_id` | Code département (ex. `"01"`, `"2A"`) | Identifiant pour retrouver la réponse. **Unique** par ligne. |
| `method` | `"POST"` | Requis par l'API Batch |
| `url` | `"/v1/chat/completions"` | Endpoint Chat Completions |
| `body.model` | `"gpt-4o"` | Modèle utilisé (vérifier [disponibilité Batch](https://platform.openai.com/api/docs/models)) |
| `body.messages` | `[{ "role": "user", "content": "..." }]` | Prompt généré par `getPromptPasse2()` |
| `body.response_format` | `{ "type": "json_object" }` | Réponse structurée JSON |
| `body.max_tokens` | `16000` | Plafond tokens par réponse |

---

## Contenu du prompt (`body.messages[0].content`)

Identique à celui produit par `scripts/prompt-passe2.ts` via `getPromptPasse2(ctx, pbvfDep, nbGptComplement)` :

- Contexte département (nom, code, tier)
- Liste des PBVF du département (si présents)
- Instructions patrimoine, plages, barème scores
- Structure JSON attendue en sortie

---

## Format de la réponse (output)

Chaque ligne du fichier de sortie (`batch_output.jsonl`) a la forme :

```json
{
  "id": "batch_req_xxx",
  "custom_id": "24",
  "response": {
    "status_code": 200,
    "body": {
      "choices": [
        {
          "message": {
            "content": "{\"patrimoine\": [...], \"patrimoine_pbvf\": [...], \"plages\": [...]}"
          }
        }
      ]
    }
  },
  "error": null
}
```

- `custom_id` : code département (permet d'associer à l'input)
- `response.body.choices[0].message.content` : JSON string avec `patrimoine`, `patrimoine_pbvf`, `plages`

En cas d'erreur : `response` peut être `null` et `error` contient `{ "code": "...", "message": "..." }`.

---

## Liste des départements (97)

Codes : `01` à `95` (métropole, sauf 20 = 2A/2B pour la Corse), `2A`, `2B`.

Exclusions : DOM-TOM (97x), départements fusionnés (20 → 2A, 2B).
