# Matronassist-ci

Plateforme de suivi maternel : les matrones tiennent les dossiers de grossesse de
leurs patientes, les patientes suivent leur grossesse et échangent avec leur
matrone référente, l'administration pilote le réseau.

Application Next.js 16 (App Router) avec backend intégré et base PostgreSQL via
Prisma, installable sur mobile et utilisable hors connexion. **Aucune donnée de démonstration** : la base démarre vide et se
remplit par l'usage.

Fonctionnalités : comptes et rôles, dossiers de grossesse, consultations et
constantes vitales, agenda, journal de grossesse, comptage des mouvements
fœtaux, chat en direct, **appels audio/vidéo pair-à-pair** entre patiente et
matrone, et **fonctionnement hors ligne** avec resynchronisation automatique.

## Démarrage

L'application utilise **PostgreSQL** en développement comme en production. Une
base gratuite (Neon, Supabase, Vercel Postgres) suffit pour démarrer.

```bash
cp .env.example .env          # puis renseigner DATABASE_URL et DIRECT_URL
npm install                   # génère le client Prisma automatiquement
npm run db:migrate            # crée les tables
npm run create-admin -- --email admin@structure.ci --name "Nom Prénom"
npm run dev
```

Les **deux** variables sont obligatoires, sans quoi Prisma refuse de lire le
schéma :

- `DATABASE_URL` : la connexion de l'application, qui peut passer par un pool.
- `DIRECT_URL` : la connexion directe, utilisée par les migrations. `prisma
  migrate` exécute du DDL, qu'un pool en mode transaction (Neon, Supabase,
  Vercel Postgres) n'accepte pas. **Sans pool, reprenez la même valeur que
  `DATABASE_URL`.**

`create-admin` affiche un mot de passe provisoire **une seule fois**.
Connectez-vous avec sur `/login` : l'application impose d'en choisir un nouveau
avant de donner accès aux données.

Tout le reste se crée depuis l'interface : l'administrateur crée les comptes
matrones, chaque matrone crée les dossiers de ses patientes et, si elle le
souhaite, leur ouvre un accès à l'application.

### Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Cycle de vie Next.js |
| `npm run db:migrate` | Crée une migration et l'applique (développement) |
| `npm run db:deploy` | Applique les migrations existantes (production) |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run create-admin` | Crée ou réinitialise un compte administrateur |

## Authentification

- **Mots de passe** : hachés avec `scrypt` (N = 2¹⁴, sel aléatoire par compte),
  comparés à temps constant. Politique : 10 caractères minimum, au moins une
  lettre et un chiffre.
- **Sessions** : un jeton aléatoire de 32 octets est déposé dans un cookie
  `httpOnly` / `SameSite=Lax` / `Secure` en production. Seule son empreinte
  SHA-256 est stockée, donc une fuite de la base ne permet pas de rejouer une
  session. Durée de vie : 30 jours.
- **Comptes** : aucune inscription publique. Les comptes sont provisionnés par
  l'administrateur (matrones) ou par la matrone (patientes), avec un mot de passe
  provisoire affiché une seule fois et à changer à la première connexion.
- **Révocation** : désactiver un compte ou changer son mot de passe supprime
  immédiatement toutes ses sessions ouvertes.
- **Anti-énumération** : identifiant inconnu, mot de passe faux et compte
  désactivé renvoient le même message, et le hachage est calculé même sans compte
  correspondant pour ne pas révéler l'existence d'un email par le temps de réponse.

## Autorisations

Le contrôle se fait dans chaque route (`requireUser`) et dans chaque page serveur.
Il n'y a **pas** de middleware d'authentification : Prisma ne fonctionne pas dans
le runtime edge, donc le contrôle est fait au plus près de la donnée.

| Rôle | Périmètre |
| --- | --- |
| `admin` | Tout le réseau : comptes matrones, tous les dossiers, statistiques globales |
| `matrone` | Uniquement les patientes qui lui sont rattachées |
| `patiente` | Uniquement son propre dossier |

Un dossier hors périmètre renvoie **404 et non 403**, pour ne pas révéler
l'existence des dossiers suivis par une autre matrone.

## API

Toutes les réponses suivent la forme `{ success, data?, message?, errors? }`.
Les entrées sont validées par `zod`. Le client typé est `lib/api-client.ts`.

| Méthode | Route | Accès |
| --- | --- | --- |
| `POST` | `/api/auth/login` · `/logout` | public · connecté |
| `GET` | `/api/auth/me` | connecté |
| `POST` | `/api/auth/password` | connecté |
| `GET` `POST` | `/api/matrones` | admin |
| `GET` `PATCH` `DELETE` | `/api/matrones/:id` | admin |
| `POST` | `/api/matrones/:id/password` | admin |
| `GET` | `/api/patients` | selon périmètre |
| `POST` | `/api/patients` | admin, matrone |
| `GET` `PATCH` | `/api/patients/:id` | selon périmètre |
| `DELETE` | `/api/patients/:id` | admin |
| `GET` | `/api/patients/:id/consultations` | selon périmètre |
| `POST` | `/api/patients/:id/consultations` | admin, matrone |
| `GET` | `/api/patients/:id/journal` · `/movements` | selon périmètre |
| `POST` | `/api/patients/:id/journal` · `/movements` | la patiente concernée |
| `GET` `POST` | `/api/patients/:id/messages` | selon périmètre |
| `GET` | `/api/conversations` | selon périmètre |
| `GET` `POST` | `/api/patients/:id/calls` | patiente et sa matrone |
| `GET` | `/api/calls/incoming` | patiente et matrone |
| `GET` `PATCH` | `/api/calls/:id` | parties de l'appel |
| `GET` `POST` | `/api/calls/:id/signals` | parties de l'appel |
| `GET` `POST` | `/api/appointments` | selon périmètre |
| `GET` | `/api/stats` · `/api/alerts` | selon périmètre |

## Messagerie et appels

### Chat en direct

Le fil de discussion se met à jour tout seul : après le chargement initial, le
client ne redemande que les messages postérieurs au dernier reçu
(`GET /api/patients/:id/messages?since=<ISO>`), toutes les 3 secondes, et le
sondage s'arrête quand l'onglet passe en arrière-plan.

Ce choix — sondage plutôt que WebSocket — vient du mode de déploiement : en
fonctions serverless (Vercel), aucune connexion persistante ne peut être
maintenue de façon fiable. Le coût est une latence de quelques secondes ; le gain
est que le chat fonctionne partout, sans service tiers.

### Appels audio et vidéo

Les appels sont **pair-à-pair via WebRTC** : la voix et l'image circulent
directement d'un appareil à l'autre et **ne transitent jamais par le serveur**.
Seule la négociation (offre/réponse SDP et candidats ICE) passe par l'API, qui
sert de canal de signalisation — ce sont les seules données stockées, avec les
métadonnées d'appel (qui, quand, durée). Aucun contenu de conversation n'est
enregistré.

Déroulé : la patiente ou sa matrone lance l'appel → un appel « sonne » chez le
correspondant, détecté par sondage de `/api/calls/incoming` → il décroche ou
refuse → les deux pairs échangent leurs signaux jusqu'à l'établissement du flux
direct. Un appel non décroché passe en « manqué » au bout de 45 secondes.

Un appel n'engage que **la patiente et sa matrone référente** : l'administration,
bien qu'elle voie les dossiers, ne peut ni lancer ni rejoindre un appel.

**Limite importante** : seuls des serveurs STUN publics sont configurés par
défaut. Sans serveur TURN, les appels échouent derrière un NAT symétrique ou un
réseau d'entreprise restrictif (ordre de grandeur usuel : 10 à 20 % des cas). Le
panneau d'appel affiche alors un message explicite. Pour une fiabilité complète,
renseignez `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME` et
`NEXT_PUBLIC_TURN_CREDENTIAL` (voir `.env.example`).

Les appels nécessitent HTTPS en production : `getUserMedia` n'est disponible que
sur une origine sécurisée (localhost excepté).

## Règles métier

- **Semaine de grossesse** : calculée à partir de `pregnancyStart` (semaines
  révolues, bornée à 42). Jamais stockée, donc jamais périmée.
- **Terme prévu** : déduit du début de grossesse (280 jours) s'il n'est pas saisi.
- **Statut de surveillance** : une consultation dont les constantes dépassent les
  seuils de vigilance (tension ≥ 140/90, température ≥ 38 °C, pouls ≥ 110 bpm)
  bascule la fiche en « surveillance ». Le statut suit toujours la consultation la
  plus récente : une saisie rétroactive ne l'écrase pas. Ces seuils servent au tri
  visuel et **ne remplacent pas un avis médical**.
- **Alertes** : jamais stockées, recalculées à chaque appel depuis l'état réel des
  dossiers — constantes hors seuils, rendez-vous passés non clôturés, suivis sans
  consultation depuis plus de 60 jours. Aucune file d'alertes obsolètes à purger.
- **Suppression d'un compte matrone** : refusée tant que des patientes lui sont
  rattachées, pour préserver la référence dans leur historique. Désactiver le
  compte ou réaffecter les dossiers d'abord.

## Application mobile (PWA)

L'application s'installe sur l'écran d'accueil depuis le navigateur : sur Android,
Chrome propose « Installer l'application » ; sur iOS, *Partager → Sur l'écran
d'accueil*. Elle s'ouvre alors en plein écran, sans barre d'adresse.

**Navigation adaptée** : sur téléphone, les onglets deviennent une barre fixe en
bas de l'écran, avec des cibles tactiles de 56 px et une icône par entrée. Sur
écran large, la barre d'onglets classique est conservée.

### Fonctionnement hors ligne

Une matrone en zone mal couverte doit pouvoir travailler sans réseau.

- **Consultation** : les pages déjà visitées et les dernières réponses de l'API
  sont conservées par le service worker (`public/sw.js`) et réaffichées hors
  ligne. Une page jamais ouverte affiche l'écran `/offline`.
- **Saisie** : les écritures qui échouent faute de réseau sont conservées dans
  IndexedDB et **rejouées automatiquement au retour de la connexion**, dans
  l'ordre de saisie. L'indicateur de la barre du haut affiche ce qui reste à
  transmettre et permet de relancer l'envoi à la main.
- **Ce qui est mis en file** : consultations, rendez-vous, entrées de journal,
  relevés de mouvements et messages. En sont exclues les opérations qui n'auraient
  pas de sens différées : création de compte (elle produit un mot de passe affiché
  une seule fois) et appels (ils dépendent de l'instant).
- Une écriture rejetée par le serveur (validation, droits) est retirée de la file
  plutôt que réessayée indéfiniment, sinon elle bloquerait tout ce qui la suit.

Le service worker n'est actif qu'en production, pour ne pas masquer les
modifications de code pendant le développement.

## Déploiement

### 1. Provisionner la base

Créez une base PostgreSQL (Neon, Supabase, Vercel Postgres…) et récupérez sa
chaîne de connexion. Si l'hébergeur impose un pool de connexions, renseignez
`DIRECT_URL` en plus (voir `.env.example`).

### 2. Configurer les secrets GitHub

Dans *Settings → Secrets and variables → Actions* :

| Secret | Rôle |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `VERCEL_TOKEN` | Jeton personnel Vercel |
| `VERCEL_ORG_ID` | Identifiant d'organisation Vercel |
| `VERCEL_PROJECT_ID` | Identifiant du projet Vercel |

Renseignez également `DATABASE_URL` dans les variables d'environnement du projet
Vercel : c'est elle qui sera lue à l'exécution.

### 3. Déployer

Un push sur `master` déclenche `.github/workflows/deploy.yml`, qui installe les
dépendances (le `postinstall` génère le client Prisma), type-check, construit,
**applique les migrations** puis déploie sur Vercel.

### 4. Créer le premier administrateur

Une fois la base migrée, depuis votre poste :

```bash
DATABASE_URL="postgresql://…" npm run create-admin -- --email admin@structure.ci --name "Nom"
```

Le mot de passe provisoire s'affiche une seule fois.

### Notes

- Les appels audio/vidéo exigent HTTPS — Vercel le fournit par défaut.
- Le service worker et l'installation sur l'écran d'accueil ne fonctionnent
  également qu'en HTTPS.

## Sécurité — points d'attention avant une mise en production réelle

Cette application manipule des données de santé. Les éléments suivants restent à
traiter selon votre contexte réglementaire :

- Aucune limitation du nombre de tentatives de connexion (pas de rate limiting) :
  à ajouter au niveau de l'hébergeur ou d'un reverse proxy.
- Pas de journal d'audit des accès aux dossiers médicaux.
- Pas de procédure de réinitialisation de mot de passe en autonomie : elle passe
  aujourd'hui par l'administrateur.
- L'hébergement de données de santé peut être soumis à agrément selon la
  juridiction visée.
- Les appels ne sont ni enregistrés ni journalisés au-delà de leurs métadonnées ;
  si votre cadre impose une traçabilité des téléconsultations, elle reste à
  ajouter.

## Licence

Distribué sous licence [MIT](LICENSE) : utilisation, modification et
redistribution libres, à condition de conserver la mention de copyright.
