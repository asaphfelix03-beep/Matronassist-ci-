# Contribuer à Matronassist-ci

Merci de votre intérêt pour le projet. Ce document décrit la marche à suivre.

## Avant tout : une application en service

Matronassist est **déployée et utilisée**, avec de vrais dossiers de suivi de
grossesse. Une erreur ne casse pas une démo : elle peut priver une matrone de
l'accès au dossier d'une patiente. D'où les quelques garde-fous ci-dessous.

`master` est protégée : toute modification passe par une pull request validée,
et la CI doit être verte. Personne ne pousse directement, y compris pour un
correctif d'une ligne.

## Installer le projet

Il faut Node.js 22 et une base PostgreSQL. Une offre gratuite (Neon, Supabase,
Vercel Postgres) suffit ; **n'utilisez jamais la base de production.**

```bash
git clone https://github.com/asaphfelix03-beep/Matronassist-ci-.git
cd Matronassist-ci-
cp .env.example .env          # renseigner DATABASE_URL et DIRECT_URL
npm install
npm run db:migrate
npm run create-admin -- --email admin@exemple.ci --name "Votre Nom"
npm run dev
```

Les deux URLs de base sont obligatoires : `prisma migrate` exécute du DDL, qu'un
pool de connexions en mode transaction n'accepte pas. Sans pool, mettez la même
valeur dans les deux.

`create-admin` affiche un mot de passe provisoire **une seule fois**. La base
démarre vide : créez vos comptes matrones et patientes depuis l'interface.

## Proposer une modification

1. Créez une branche depuis `master` : `git switch -c sujet-de-la-modification`
2. Vérifiez avant de pousser — ce sont les mêmes contrôles que la CI :

   ```bash
   npx tsc --noEmit    # typage
   npm run lint        # 0 erreur attendue
   npm run build       # doit compiler
   ```

3. Ouvrez une pull request en expliquant **le problème résolu**, pas seulement
   le changement. Si vous corrigez un bug, dites comment vous l'avez reproduit.

## Conventions

- **Langue** : interface, messages d'erreur, commentaires et commits en
  français. L'application s'adresse à des matrones ivoiriennes.
- **Commentaires** : expliquez *pourquoi*, jamais *quoi*. Un commentaire qui
  paraphrase le code sera demandé en suppression.
- **Messages de commit** : une ligne de résumé à l'impératif, puis le contexte.
  Pour un correctif, indiquez la cause réelle du défaut.

## Ce qui demande une attention particulière

- **Migrations Prisma** : elles s'appliquent automatiquement en production au
  passage de la CI. Une migration destructrice est irréversible. Signalez-la
  explicitement dans la pull request.
- **Contrôle d'accès** : chaque route API commence par `requireUser()`, il n'y a
  pas de middleware d'authentification. Une route qui l'oublie est ouverte à
  tous. Le périmètre des données passe par `patientScope()`.
- **Appels audio/vidéo** : le média circule en pair-à-pair et ne transite jamais
  par le serveur, qui ne sert qu'à la signalisation. Toute modification doit
  préserver cette propriété.
- **Données de santé** : n'ajoutez jamais de données réelles de patientes dans le
  dépôt, ni dans les tests, ni dans les captures d'écran.

## Signaler un problème

Ouvrez une issue en décrivant ce que vous attendiez, ce qui s'est produit, et
comment le reproduire. Pour un problème de sécurité, contactez directement le
mainteneur plutôt que d'ouvrir une issue publique.
