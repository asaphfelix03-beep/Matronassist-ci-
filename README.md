# Matronassist-ci

Application Next.js pour la gestion d'une plateforme de suivi maternel avec un backend intégré.

## Fonctionnalités principales
- Authentification demo basée sur `localStorage`
- Tableau de bord admin avec gestion des comptes de matrones
- Backend intégré à Next.js via `app/api` pour la création, lecture et modification des matrones
- Base de données SQLite locale gérée par Prisma

## Configuration locale
1. Installer les dépendances:
   ```bash
   npm install
   ```
2. Générer le client Prisma (déjà fait, mais à réexécuter si le schéma change):
   ```bash
   npx prisma generate
   ```
3. Appliquer la migration SQLite:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Lancer en mode développeur:
   ```bash
   npm run dev
   ```

## Build et production
```bash
npm run build
npm start
```

## Notes
- Le fichier de base de données SQLite local est `prisma/dev.db`.
- Dans un vrai déploiement, il est recommandé de remplacer SQLite par une base gérée (PostgreSQL) et d'ajouter une authentification sécurisée.
