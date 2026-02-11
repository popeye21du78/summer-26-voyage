# Contenu par ville

Structure pour les **photos de couverture** et les **textes** de chaque ville.

---

## 1. Photos

**Dossier** : `public/voyage/villes/[slug]/`

| Fichier       | Usage                                           |
|---------------|--------------------------------------------------|
| `cover.jpg`   | Photo principale : popup survol, page ville, hero Book |

**Convention :**

- `[slug]` = identifiant de la ville en minuscules, tirets (ex. `paris`, `bordeaux`, `saint-jean-de-luz`)
- Format recommandé : JPG ou WebP, ratio 16:9 ou 4:3
- Nom exact : `cover.jpg` (ou `cover.webp`, `cover.png`)
- URL servie : `/voyage/villes/paris/cover.jpg`

**Exemple :**

```
public/voyage/villes/
├── paris/
│   └── cover.jpg
├── bordeaux/
│   └── cover.jpg
└── saint-jean-de-luz/
    └── cover.jpg
```

---

## 2. Textes

**Fichier** : `content/villes/[slug].md`

Chaque ville dispose d'un fichier Markdown avec frontmatter (titre, sous-titre) et corps de texte.

**Format :**

```markdown
---
titre: Bordeaux, porte du Sud-Ouest
sous_titre: La Garonne, les quais et le vin
---

Texte de présentation de la ville.
Peut s'étendre sur plusieurs paragraphes.
```

| Champ frontmatter | Usage                    |
|------------------|--------------------------|
| `titre`          | Titre principal (popup, page ville) |
| `sous_titre`     | Sous-titre / accroche    |
| Corps (texte)    | Description longue       |

---

## 3. Correspondance avec l'app

- **Popup survol** : `cover.jpg` + `titre` + `sous_titre`
- **Page `/ville/[slug]`** : idem + corps
- **Book** : `cover.jpg` en fallback si aucune photo uploadée
