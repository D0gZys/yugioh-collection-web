<div align="center">

# 📚 Yu-Gi-Oh! Collection Web

Application Next.js 15 (App Router) pour piloter une collection de cartes Yu-Gi-Oh!, importer des séries depuis Yugipedia et suivre l’avancement de la complétion.

</div>

---

## ✨ Fonctionnalités principales

- **Tableau de bord collection**
  - Liste des séries triées par nom avec code, nombre de cartes et jauge de complétion (calcul possédé / versions suivies).
  - Barre de recherche « bulle » pour filtrer instantanément par nom ou code de série.
  - Accès rapide au convertisseur et aux statistiques.

- **Page série**
  - Filtres avancés (artwork, rareté, possession, recherche texte).
  - Mise à jour en un clic de la possession d’une version (API Prisma).
  - Statistiques globales (complétion, répartitions d’artworks, progression).

- **Convertisseur intelligent**
  - Import automatique via URL Yugipedia ou collage d’un `<tbody>` HTML.
  - Détection des artworks, raretés et doublons, édition inline, filtres, historique local.
  - Persistance locale de l’état (HTML, URL, cartes) pour éviter toute perte avant sauvegarde.
  - Isolement des doublons et mise en évidence des lignes invalides via scroll automatique.

- **Page statistiques**
  - Agrégations Prisma (séries, cartes, raretés, artworks, complétion globale).
  - Graphiques CSS/SVG légers : distribution des raretés, répartition des artworks, activité 6 derniers mois.
  - Liste des séries les plus avancées pour prioriser les complétions.

## 🧱 Stack technique

- **Framework** : Next.js 15 (App Router) + React 19.
- **Base de données** : PostgreSQL (Prisma ORM).
- **Styling** : Tailwind CSS (classes utilitaires custom) + effets verre dépoli.
- **Tests** : Vitest.
- **Lint** : ESLint config Next.js.

## 🚀 Démarrage rapide

### 1. Pré-requis

- Node.js 20+
- PostgreSQL 15+ (ou service hébergé)

### 2. Variables d’environnement

```bash
cp .env.example .env
# renseignez DATABASE_URL, ex :
# postgres://user:password@localhost:5432/yugioh_collection
```

### 3. Base de données

```bash
# macOS
brew install postgresql@15 && brew services start postgresql@15

# Linux
sudo apt install postgresql postgresql-contrib

# Windows : installez depuis postgresql.org

createdb yugioh_collection
```

### 4. Installation & migrations

```bash
npm install         # exécute automatiquement prisma generate
npm run db:migrate  # applique les migrations locales
```

### 5. Lancer l’app

```bash
npm run dev
# http://localhost:3000
```

> Astuce : définissez `NEXT_PUBLIC_PRISMA_LOG_QUERIES=true` dans `.env` pour afficher toutes les requêtes Prisma en dev.

## 📂 Structure du projet

```
src/
 ├─ app/               # Routes App Router (accueil, convertisseur, statistiques, série/[id])
 ├─ lib/               # Helpers (normalisation noms, détection artworks, Prisma client…)
 └─ generated/         # Artefacts Prisma (client)

prisma/
 └─ schema.prisma      # Modèle Series / Carte / Rarete / CarteRarete
```

## 🛠️ Scripts npm

| Commande              | Description |
| --------------------- | ----------- |
| `npm run dev`         | Next.js en mode développement (Turbopack) |
| `npm run build`       | Build de production |
| `npm run start`       | Lance le build |
| `npm run lint`        | Lint TypeScript + React |
| `npm run lint:fix`    | Lint avec auto-fix |
| `npm run test`        | Tests unitaires Vitest (`src/lib/*.test.ts`) |
| `npm run db:migrate`  | `prisma migrate dev` (migrations locales) |
| `npm run db:push`     | `prisma db push` (sync schéma rapide) |
| `npm run db:studio`   | Prisma Studio |
| `npm run db:generate` | Génération manuelle du client Prisma |

## ✅ Qualité & tests

- Typescript strict, ESLint (config Next).
- Tests Vitest pour la détection d’artworks et la normalisation des noms (`src/lib/card.test.ts`).
- Schemas Zod côté API (`/api/fetch-cards`, `/api/save-series`, `/api/carte-rarete/update`).
- CI locale : `npm run lint`, `npm run test`.

## 📊 Alimentation de la base

1. Importez une série via le convertisseur (URL Yugipedia ou HTML).
2. Vérifiez les doublons / lignes invalides.
3. Sauvegardez : les cartes et raretés sont créées en base, la page d’accueil se met à jour.

Les jauges de complétion exploitent les `CarteRarete.possedee` : modifiez les statuts depuis la page série pour refléter votre collection.

## 🔧 Déploiement

L’application tourne en production via `npm run build && npm run start`.  
Assurez-vous que `DATABASE_URL` pointe vers une instance PostgreSQL accessible publiquement (Vercel, Render, Railway, etc.) et que les migrations ont été exécutées (`npm run db:migrate`).

---

Bon build et bonne complétion de collection ! 😊
