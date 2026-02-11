# Obtenir un token Mapbox (gratuit)

La carte utilise Mapbox. Le compte gratuit permet **50 000 chargements de carte par mois**, largement suffisant pour un usage perso.

## Étapes

1. **Créer un compte**  
   → [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/)  
   (email + mot de passe, pas de carte bancaire demandée)

2. **Récupérer le token**  
   → [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)  
   Tu verras un **Default public token** (commence par `pk.`). Clique dessus pour le copier.

3. **Configurer le projet**  
   À la racine du projet (dossier `summer-26-prefailles-marseille`), crée un fichier nommé exactement **`.env.local`** avec une seule ligne :

   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.ton_token_ici
   ```

   Remplace `pk.ton_token_ici` par le token copié (sans espace, sans guillemets).

4. **Redémarrer le serveur**  
   Arrête le serveur (Ctrl+C dans le terminal), puis relance :

   ```bash
   npm run dev
   ```

5. Ouvre ou rafraîchis **http://localhost:3001** (ou le port affiché). La carte doit s’afficher.

## Utilisation

Le token sert pour : **Carte** (Mapbox GL), **Géocodage** (`/api/geocode`), **Directions** (`/api/directions`). Sans token, les trajets du planning utilisent une estimation Turf.js.

## Sécurité

- Ne commite **jamais** le fichier `.env.local` (il est déjà dans `.gitignore`).
- Ne partage pas ton token en public. En production, tu pourras restreindre le token par domaine dans le dashboard Mapbox.
