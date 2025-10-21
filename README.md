## Configuration rapide

1. **Variables d’environnement**
   ```bash
   cp .env.example .env
   # Renseignez DATABASE_URL (PostgreSQL local ou distant)
   ```

2. **Base PostgreSQL**
   - macOS : `brew install postgresql@15 && brew services start postgresql@15`
   - Windows : installez depuis [postgresql.org](https://www.postgresql.org/)
   - Linux : `sudo apt install postgresql postgresql-contrib`
   - Créez la base : `createdb yugioh_collection`

3. **Installation des dépendances**
   ```bash
   npm install
   # déclenche automatiquement `prisma generate`
   ```

## Scripts utiles

| Commande              | Description |
| --------------------- | ----------- |
| `npm run dev`         | Démarre le serveur Next.js en mode dev (Turbopack) |
| `npm run build`       | Build de production |
| `npm run start`       | Démarre la version buildée |
| `npm run lint`        | Lint TypeScript/React |
| `npm run lint:fix`    | Lint + auto-fix |
| `npm run test`        | Tests unitaires Vitest (`src/lib/*.test.ts`) |
| `npm run db:migrate`  | `prisma migrate dev` (migrations locales) |
| `npm run db:push`     | `prisma db push` (synchro schéma rapide) |
| `npm run db:studio`   | Prisma Studio |
| `npm run db:generate` | Génération manuelle du client Prisma |

> Astuce : définissez `NEXT_PUBLIC_PRISMA_LOG_QUERIES=true` dans votre `.env` pour afficher les requêtes SQL Prisma pendant le développement.

## Lancement

```bash
npm run dev
# http://localhost:3000
```

La page d’accueil liste les séries persistées. La page `convertisseur` permet :
- soit de récupérer automatiquement un set depuis Yugipedia (`/api/fetch-cards` renvoie des cartes structurées),
- soit de coller un `<tbody>` HTML pour l’analyser côté client avant sauvegarde dans la base (`/api/save-series`).

## Qualité & Tests

- ESLint + TypeScript strict.
- Validation Zod sur les routes API (`/api/fetch-cards`, `/api/save-series`, `/api/carte-rarete/update`).
- Tests unitaires Vitest pour la détection d’artworks et la normalisation des noms (`src/lib/card.test.ts`).

## Déploiement

Le projet s’exécute sur Next.js 15 (App Router). Assurez-vous que la variable `DATABASE_URL` pointe vers une base accessible depuis votre environnement (Vercel/Render, etc.) avant de lancer `npm run build && npm run start`.
