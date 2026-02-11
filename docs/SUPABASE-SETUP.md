# Guide Supabase – Van-Life Journal

## 1. Créer un compte (gratuit)

1. Va sur **https://supabase.com**
2. Clique sur **Start your project**
3. Connecte-toi avec GitHub ou ton email
4. Crée une **organisation** (ex. ton nom ou "Voyage")
5. Crée un **nouveau projet** : nom "van-life-journal", mot de passe (garde-le), région proche de toi

---

## 2. Récupérer les clés API

1. Dans le dashboard Supabase, va dans **Project Settings** (icône engrenage) → **API**
2. Note :
   - **Project URL** (ex. `https://xxxx.supabase.co`)
   - **anon public** – la clé commence en général par `eyJ...` (format JWT)

Tu les mets dans `.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Important :** La clé **service_role** se trouve aussi dans API (sous anon). Elle contourne les politiques RLS – utile pour l’upload de photos. **Ne jamais** la préfixer par `NEXT_PUBLIC_` (elle doit rester côté serveur).

---

## 3. Créer la table et le bucket

### Tables

1. Va dans **SQL Editor** → **New query**
2. Copie le contenu de `docs/supabase-schema.sql`
3. Colle et exécute (Run)

Le schéma crée : `book_sections` (Book), `itinerary` (planning du voyage).

**Migration nuitée/budgets** : si la table `itinerary` existe déjà, exécute aussi `docs/supabase-migration-itinerary-nuitee.sql` pour ajouter les colonnes nuitée, culture, nourriture.

**Migration photo ville** : exécute `docs/supabase-migration-photo-ville.sql` pour ajouter la colonne `photo_url` (cache Unsplash).

**Migration sections texte** : exécute `docs/supabase-migration-city-sections.sql` pour créer la table `city_sections` (textes IA par ville).

### Bucket Storage

1. Va dans **Storage**
2. **New bucket** → nom : `photos`
3. Coche **Public bucket** (pour afficher les images)
4. Create

### Politique Storage (pour l'upload)

Dans Storage → bucket **photos** → **Policies** → **New policy** :
- "Allow uploads" : **INSERT** pour `authenticated` ou `anon` (selon ton besoin)
