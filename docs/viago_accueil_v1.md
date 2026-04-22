# Viago — Accueil dynamique V1

## Objectif
Définir **ce qui doit apparaître sur la page d’accueil** en fonction de la situation du user, **sans appel à une API d’IA**, avec une logique **100 % scriptée**, extensible ensuite à une grande bibliothèque de variantes textuelles.

Cette V1 est volontairement **incomplète côté volume rédactionnel** :
- **1 texte principal par situation**
- une seule proposition de contenu par cas
- structure pensée pour accueillir ensuite **10 variantes minimum par situation**
- logique de priorité incluse pour éviter les collisions entre états

---

## 1) Principes produit

### 1.1 But de l’accueil
L’accueil ne doit pas être une simple vitrine statique.
Il doit devenir un **hub émotionnel + actionnable** qui répond immédiatement à la question :
**“Qu’est-ce que Viago me montre maintenant, selon ma vraie situation de voyage ?”**

L’accueil doit donc toujours faire 4 choses :
1. **Qualifier l’état du user** (pas de voyage, voyage à venir, voyage en cours, retour récent, etc.)
2. **Afficher un contenu éditorial ou émotionnel adapté**
3. **Proposer l’action la plus pertinente immédiatement**
4. **Varier légèrement le ton ou le bloc secondaire** pour éviter la répétition

### 1.2 Contraintes UX
- Tout doit idéalement **tenir sur une seule page**
- Scroll autorisé seulement si nécessaire pour le cas “voyage en cours”, en mode **fiche du jour**
- Pas de sensation de page vide
- Le premier écran doit rester **lisible en moins de 2 secondes**
- Le user doit comprendre immédiatement :
  - où il en est
  - quoi faire
  - pourquoi ce contenu lui est montré

### 1.3 Contraintes techniques
- **Zéro IA runtime**
- Tout doit être généré par :
  - conditions logiques
  - bibliothèque de textes pré-écrits
  - randomisation contrôlée
  - règles de priorité
- Tous les contenus doivent être **versionnables dans un seul gros fichier de config**

---

## 2) Structure recommandée du fichier source

Créer un fichier unique du type :

`home_content_config.ts`

ou à défaut un JSON structuré :

`home_content_config.json`

Ce fichier doit centraliser :
- les **situations**
- les **conditions d’entrée**
- les **priorités**
- les **composants affichés**
- les **textes variables**
- les **CTA**
- les **fonds / variantes visuelles**
- les **règles de randomisation**

---

## 3) Ordre de priorité des situations

L’ordre est essentiel. Si plusieurs conditions sont vraies, on n’affiche **qu’un seul état principal**.

### Priorité proposée
1. **Voyage en cours**
2. **Voyage qui démarre dans moins de 24 h**
3. **Prochain voyage à venir**
4. **Plusieurs voyages prévus**
5. **Retour ultra-récent de voyage**
6. **Retour récent de voyage**
7. **Aucun voyage mais historique existant**
8. **Aucun voyage du tout**

### Règles critiques
- Si user est **en voyage actuellement**, cet état écrase tout le reste
- Si user a fini un voyage **il y a 2 jours** mais a déjà un prochain départ prévu, la priorité va au **voyage prévu**
- Si user a **plusieurs voyages prévus**, l’accueil doit mettre en avant **le plus proche**, avec possibilité d’accès au reste
- Si deux voyages ont des dates incompatibles ou se chevauchent, afficher une **alerte douce**

---

## 4) Variables à calculer côté app

Pour alimenter l’accueil, l’app doit être capable de calculer :
- `hasAnyTrip`
- `hasPastTrip`
- `hasUpcomingTrip`
- `hasMultipleUpcomingTrips`
- `hasCurrentTrip`
- `daysSinceLastTripEnd`
- `daysUntilNextTripStart`
- `hoursUntilNextTripStart`
- `currentTripDayIndex`
- `currentTripTotalDays`
- `currentStepName`
- `nextStepName`
- `isSharedTrip`
- `isFirstAppOpenEver`
- `isFirstOpenOfSession`
- `openMoment` = morning / afternoon / evening
- `hasLocationEnabled`
- `hasConflictingUpcomingTrips`
- `dailyThoughtId`
- `dailyEditorialCardId`

---

## 5) Slots de contenu de la page d’accueil

L’accueil peut être pensé comme l’assemblage de slots fixes.

### Slots
- `heroLogo`
- `heroBackground`
- `eyebrow` (petite ligne de contexte)
- `headline`
- `subheadline`
- `primaryCTA`
- `secondaryCTA`
- `statusChip`
- `tripCard`
- `daySheet`
- `mapPreview`
- `dailyThought`
- `editorialCard`
- `gentleAlert`
- `lastTripShortcut`

Tous les cas n’utilisent pas tous les slots.

---

## 6) États d’accueil — V1

---

### CAS 1 — Aucun voyage, aucun historique

#### Condition
- `hasAnyTrip = false`
- `hasPastTrip = false`
- `hasUpcomingTrip = false`
- `hasCurrentTrip = false`

#### Intention
Faire entrer le user dans l’univers Viago sans pression, avec une promesse claire : inspiration + préparation simple.

#### Fond
- Vidéo `A2.mp4`
- Logo Viago recolorisé proprement (pas noir brut)

#### Contenu affiché
- `headline`: **Lance ton premier grand départ**
- `subheadline`: **Carnet, carte, envies : tout commence ici.**
- `primaryCTA`: **Trouver l’inspiration**
- `secondaryCTA`: **Créer mon premier voyage**
- `dailyThought`: oui
- `editorialCard`: oui

#### Notes
- Prévoir plus tard une distinction entre **première ouverture absolue** et **retour sans action après première visite**
- Le ton de la 2e connexion devra être moins “premier onboarding” et plus “on y va ?”

---

### CAS 2 — Aucun voyage prévu, mais historique de voyage existant

#### Condition
- `hasCurrentTrip = false`
- `hasUpcomingTrip = false`
- `hasPastTrip = true`

#### Intention
Réactiver l’envie de repartir en s’appuyant sur l’identité voyageuse déjà existante.

#### Fond
- Vidéo `A2.mp4`

#### Contenu affiché
- `headline`: **Envie de repartir ?**
- `subheadline`: **{{firstName}}, la route t’appelle encore.**
- `primaryCTA`: **Trouver l’inspiration**
- `secondaryCTA`: **Revivre mon dernier voyage**
- `statusChip`: **Dernier voyage il y a {{daysSinceLastTripEnd}} jours**
- `dailyThought`: oui

#### Notes
- À enrichir plus tard par paliers : J+2, J+7, J+20, J+45, etc.
- Le compteur temps depuis le dernier voyage peut devenir un vrai bloc visuel fort

---

### CAS 3 — Dernier voyage très récent, pas de prochain voyage

#### Condition
- `hasCurrentTrip = false`
- `hasUpcomingTrip = false`
- `daysSinceLastTripEnd <= 3`

#### Intention
Capitaliser sur l’émotion chaude du retour.

#### Fond
- Vidéo `A2.mp4`

#### Contenu affiché
- `headline`: **À peine rentré… déjà envie d’y retourner ?**
- `subheadline`: **Ton dernier Viago est encore tout frais. On le revit ou on prépare le suivant ?**
- `primaryCTA`: **Revoir mon dernier voyage**
- `secondaryCTA`: **Trouver l’inspiration**
- `statusChip`: **Retour il y a {{daysSinceLastTripEnd}} jours**

#### Notes
- Cas distinct du retour “classique”, car émotion plus forte et plus actionnable

---

### CAS 4 — Un voyage prévu dans plus de 60 jours

#### Condition
- `hasUpcomingTrip = true`
- `daysUntilNextTripStart > 60`
- `hasCurrentTrip = false`

#### Intention
Montrer qu’un voyage existe déjà, mais pousser aussi soit l’approfondissement, soit l’envie d’en imaginer un autre avant.

#### Fond
- Vidéo `A2.mp4`

#### Contenu affiché
- `eyebrow`: **Bientôt**
- `headline`: **{{nextTripName}}**
- `subheadline`: **Départ dans {{daysUntilNextTripStart}} jours. C’est loin, mais c’est déjà en route.**
- `primaryCTA`: **Préparer ce voyage**
- `secondaryCTA`: **Trouver l’inspiration**
- `statusChip`: **J-{{daysUntilNextTripStart}}**

#### Notes
- Plus tard : ton plus décalé, plus drôle, plus varié
- Possibilité d’ajouter un bloc “Tu veux en vivre un autre avant ?”

---

### CAS 5 — Un voyage prévu entre 15 et 60 jours

#### Condition
- `hasUpcomingTrip = true`
- `15 <= daysUntilNextTripStart <= 60`
- `hasCurrentTrip = false`

#### Intention
Basculer du rêve à l’anticipation réelle.

#### Contenu affiché
- `eyebrow`: **Bientôt**
- `headline`: **{{nextTripName}}**
- `subheadline`: **Ton départ approche. C’est le bon moment pour affiner ton Viago.**
- `primaryCTA`: **Préparer ce voyage**
- `secondaryCTA`: **Voir les étapes**
- `statusChip`: **J-{{daysUntilNextTripStart}}**
- `dailyThought`: oui

#### Notes
- Plus tard : une variante spécifique pour J-14

---

### CAS 6 — Un voyage prévu dans les 10 derniers jours avant départ

#### Condition
- `hasUpcomingTrip = true`
- `1 <= daysUntilNextTripStart <= 10`
- `hasCurrentTrip = false`

#### Intention
Mettre le user en mode départ imminent.

#### Contenu affiché
- `eyebrow`: **Bientôt**
- `headline`: **{{nextTripName}}**
- `subheadline`: **Plus que {{daysUntilNextTripStart}} jours avant le départ. Il est temps de tout caler.**
- `primaryCTA`: **Préparer ce voyage**
- `secondaryCTA`: **Voir ma checklist**
- `statusChip`: **J-{{daysUntilNextTripStart}}**
- `gentleAlert`: optionnel si infos manquantes

#### Notes
- Plus tard : 10 textes par jour entre J-10 et J-1
- CTA variables selon état réel du voyage (incomplet, prêt, partagé, etc.)

---

### CAS 7 — Départ dans moins de 24 heures

#### Condition
- `hasUpcomingTrip = true`
- `hoursUntilNextTripStart < 24`
- `hasCurrentTrip = false`

#### Intention
Créer un mini-moment de tension positive juste avant le départ.

#### Contenu affiché
- `eyebrow`: **C’est pour demain**
- `headline`: **{{nextTripName}}**
- `subheadline`: **Dernière ligne droite : vérifie l’essentiel avant de partir.**
- `primaryCTA`: **Préparer ce voyage**
- `secondaryCTA`: **Ouvrir ma checklist**
- `statusChip`: **Départ dans moins de 24 h**

#### Notes
- Plus tard : version plus drôle type “n’oublie pas ta brosse à dents”

---

### CAS 8 — Plusieurs voyages prévus

#### Condition
- `hasMultipleUpcomingTrips = true`
- `hasCurrentTrip = false`

#### Intention
Mettre en avant le voyage le plus proche tout en signalant que d’autres aventures existent.

#### Contenu affiché
- `eyebrow`: **Prochain départ**
- `headline`: **{{nearestTripName}}**
- `subheadline`: **Tu as {{upcomingTripCount}} voyages à venir. On commence par le plus proche.**
- `primaryCTA`: **Préparer ce voyage**
- `secondaryCTA`: **Voir tous mes voyages**
- `statusChip`: **J-{{daysUntilNextTripStart}}**
- `tripCard`: mini pile ou compteur “+{{upcomingTripCountMinusOne}} autres”

#### Notes
- Si deux voyages se chevauchent : afficher une alerte douce
- La logique doit toujours mettre l’accent sur le voyage le plus proche

---

### CAS 9 — Plusieurs voyages prévus avec conflit de dates

#### Condition
- `hasMultipleUpcomingTrips = true`
- `hasConflictingUpcomingTrips = true`
- `hasCurrentTrip = false`

#### Intention
Aider sans paniquer.

#### Contenu affiché
- `eyebrow`: **Attention**
- `headline`: **Deux voyages se chevauchent**
- `subheadline`: **Tu ne pourras sans doute pas vivre les deux en même temps. Vérifie ton planning.**
- `primaryCTA`: **Voir mes voyages**
- `secondaryCTA`: **Ajuster les dates**
- `gentleAlert`: **L’un des voyages peut passer en option**

#### Notes
- Ce cas peut être traité comme un overlay d’alerte sur le cas 8

---

### CAS 10 — Voyage en cours, solo

#### Condition
- `hasCurrentTrip = true`
- `isSharedTrip = false`

#### Intention
Transformer l’accueil en **fiche du jour de voyage**, utile, vivante, intime.

#### Fond
- Fond distinct des autres écrans
- Pas la même vidéo générique que les états pré-départ
- Univers plus carnet / terrain / route

#### Contenu affiché
- `eyebrow`: **En route**
- `headline`: **{{currentTripName}}**
- `subheadline`: **Aujourd’hui : {{currentStepName}}**
- `primaryCTA`: **Reprendre mon voyage**
- `secondaryCTA`: **Modifier en last minute**
- `daySheet`: oui
- `mapPreview`: oui
- `dailyThought`: oui
- `statusChip`: **Jour {{currentTripDayIndex}} / {{currentTripTotalDays}}**

#### Contenu de la fiche du jour
- étape du jour
- prochaine étape
- note ou réflexion du jour
- rappel des points clés
- aperçu de la carte

#### Notes
- C’est le cas qui mérite le plus de spécificité produit
- Cette page peut être légèrement scrollable
- Matin / soir devront avoir des variantes distinctes plus tard
- Si localisation désactivée : message doux pour suggérer son activation

---

### CAS 11 — Voyage en cours, partagé

#### Condition
- `hasCurrentTrip = true`
- `isSharedTrip = true`

#### Intention
Même logique que le solo, avec une dimension plus collective.

#### Contenu affiché
- `eyebrow`: **En route ensemble**
- `headline`: **{{currentTripName}}**
- `subheadline`: **Aujourd’hui : {{currentStepName}}**
- `primaryCTA`: **Reprendre notre voyage**
- `secondaryCTA`: **Modifier en last minute**
- `daySheet`: oui
- `mapPreview`: oui
- `dailyThought`: oui
- `statusChip`: **Jour {{currentTripDayIndex}} / {{currentTripTotalDays}}**

#### Éléments additionnels possibles
- mini présence des co-voyageurs
- pensée du jour partagée
- rappel de l’étape suivante

#### Notes
- Le ton doit être moins introspectif que le solo

---

### CAS 12 — Voyage en cours, matin

#### Condition
- `hasCurrentTrip = true`
- `openMoment = morning`

#### Intention
Ouvrir la journée.

#### Contenu affiché
- `headline`: **Bonjour la route**
- `subheadline`: **Aujourd’hui : {{currentStepName}}. Ton Viago du jour est prêt.**
- `primaryCTA`: **Voir ma journée**

#### Notes
- Plus tard : à fusionner proprement avec les cas 10 et 11 en système de sous-variantes

---

### CAS 13 — Voyage en cours, soir

#### Condition
- `hasCurrentTrip = true`
- `openMoment = evening`

#### Intention
Fermer la journée et encourager la mémoire du voyage.

#### Contenu affiché
- `headline`: **La journée touche à sa fin**
- `subheadline`: **Ajoute une réflexion du jour et jette un œil à demain.**
- `primaryCTA`: **Écrire ma réflexion du jour**
- `secondaryCTA`: **Voir demain**

#### Notes
- Ce cas peut devenir très fort émotionnellement

---

## 7) Blocs transversaux à afficher presque partout

### 7.1 Pensée du jour
Bloc léger, éditorial, renouvelé quotidiennement.

#### Règles
- 1 pensée différente par jour
- rotation déterministe ou pseudo-aléatoire
- clique vers : `Mon espace > Marque` ou une section éditoriale dédiée

#### Objectif
Créer une identité de marque, pas seulement une interface utilitaire.

---

### 7.2 Article / contenu suggéré du jour
Bloc secondaire optionnel.

#### Exemples d’usage
- inspiration
- manière de voyager
- idée de micro-départ
- article de marque

#### Règles
- différent selon les jours
- jamais plus prioritaire que l’état principal de voyage

---

## 8) Système de randomisation recommandé

Cette V1 contient **un seul message par situation**.
Mais la structure doit être prévue pour passer ensuite à :
- 10 variantes de `headline`
- 10 variantes de `subheadline`
- 3 à 5 CTA secondaires
- variantes conditionnelles selon heure / fréquence d’ouverture / état de complétion

### Méthode conseillée
Pour chaque situation :
- `poolA`: variantes émotionnelles
- `poolB`: variantes actionnables
- `poolC`: variantes drôles / décalées

Puis choisir selon :
- jour courant
- hash du user id
- nombre de connexions récentes
- phase du voyage

Objectif :
- éviter de montrer toujours la même phrase
- garder une cohérence éditoriale
- éviter le pur hasard incontrôlé

---

## 9) Structure de données recommandée (exemple)

```ts
export const homeContentConfig = {
  priorityOrder: [
    'current_trip',
    'depart_under_24h',
    'upcoming_trip',
    'multiple_upcoming_trips',
    'very_recent_return',
    'recent_return',
    'no_upcoming_but_has_history',
    'no_trip_ever'
  ],
  states: {
    no_trip_ever: {
      condition: '... ',
      background: 'A2.mp4',
      headline: ['Lance ton premier grand départ'],
      subheadline: ['Carnet, carte, envies : tout commence ici.'],
      primaryCTA: ['Trouver l’inspiration'],
      secondaryCTA: ['Créer mon premier voyage']
    }
  }
}
```

---

## 10) Recommandations design / contenu spécifiques à l’accueil

### Logo
- Le logo noir ne fonctionne pas tel quel
- Prévoir un traitement indépendant du fond :
  - PNG détouré
  - recolorisation via filtre ou version d’asset dédiée
  - ne surtout pas appliquer un filtre global au hero entier

### Hiérarchie visuelle
Toujours afficher dans cet ordre visuel :
1. logo
2. état du moment
3. élément central de voyage
4. CTA principal
5. CTA secondaire
6. pensée du jour / contenu éditorial

### Différence visuelle forte à créer
- **pré-voyage** = univers plus aspiration / tension positive
- **voyage en cours** = univers plus concret / carnet / carte / journée réelle
- **retour de voyage** = univers plus mémoire / nostalgie / relance

---

## 11) Ce qu’il faudra produire en V2

Étape suivante recommandée :
1. multiplier les situations fines
2. écrire **10 variantes minimum par situation**
3. ajouter les cas :
   - première connexion vs deuxième connexion
   - retour après ouverture récente
   - voyage incomplet / prêt / très prêt
   - voyage en cours matin / après-midi / soir
   - voyage en cours avec retard ou modification last minute
   - localisation activée ou non
   - voyage partagé très actif vs peu actif
4. définir le moteur exact de rotation des textes
5. relier chaque situation à des blocs UI précis

---

## 12) Résumé produit

L’accueil Viago doit devenir un système narratif conditionnel.
Ce n’est pas juste :
**“tel état = tel texte”**
mais plutôt :
**“tel état = telle famille d’intentions, tel niveau d’urgence, tel décor, tel CTA, telle variation éditoriale.”**

Cette V1 pose donc :
- la logique de priorité
- les grands états
- les slots d’interface
- les variables nécessaires
- un premier texte par situation

C’est la bonne base pour construire ensuite une **énorme bibliothèque de contenus variables**, sans coût IA, mais avec une vraie sensation de vivant.
