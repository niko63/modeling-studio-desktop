# Modeling & Simulation Studio — Desktop

Packaging Electron de [modeling-studio](https://github.com/niko63/modeling-studio).

> **Vous cherchez juste à installer l'application ?**
> Ce repo est le code source du packaging, pas un produit à télécharger.
> Allez sur **[modeling-studio-releases](https://github.com/niko63/modeling-studio-releases)** et suivez les instructions de la page — c'est ce lien qu'il faut donner aux utilisateurs.
> La suite de ce README est pour qui développe/build le packaging lui-même.

## Prérequis

- Node.js 18+ **doit être installé sur la machine** : https://nodejs.org/en/download
  - Télécharger la version LTS (Long Term Support)
  - Windows : choisir l'installeur `.msi` et suivre les étapes
  - Vérifier l'installation : ouvrir un terminal et taper `node --version`
- Pour builder la cible Windows depuis Linux/macOS : `wine` + le support multiarch i386 (`wine32:i386` sous Debian/Ubuntu)

## Développement

```bash
# 1. Installer les dépendances Electron
npm install

# 2. Initialiser le submodule
git submodule update --init --recursive

# 3. Installer les dépendances de l'app web
cd modeling-studio && npm install && cd ..

# 4. Lancer Vite (dans un terminal)
cd modeling-studio && npm run dev

# 5. Lancer Electron (dans un autre terminal)
npm run dev
```

## Build production

```bash
# Build pour la plateforme courante
npm run dist

# Build ciblé
npm run dist:win    # Windows (.exe portable, sans installeur)
npm run dist:mac    # macOS (.dmg)
npm run dist:linux  # Linux (.AppImage)
```

Chaque commande `dist*` enchaîne automatiquement :
1. `build:web` — build Vite de l'app web (`modeling-studio/dist`)
2. `build:server-deps` — installe dans `server-deps/node_modules` les SEULES dépendances npm dont `server/*.js` a besoin au runtime (actuellement `@anthropic-ai/sdk`)
3. `electron-builder` — packaging final

Le résultat est dans `dist-electron/`.

**⚠️ Piège à connaître** : `extraResources` ne copie jamais `node_modules/` automatiquement. Si un futur fichier serveur (`server/*.js`) importe un nouveau package npm, il faut l'ajouter aux dépendances de `server-deps/package.json`, sinon l'exe packagé plante au lancement avec `ERR_MODULE_NOT_FOUND` (symptôme côté utilisateur : page blanche ou "route inconnue"). Idem pour tout nouveau fichier sous `src/` importé depuis `server/` : il faut l'ajouter à `build.extraResources` dans `package.json`.

## Architecture

```
main.js          — processus principal Electron (fork le serveur, gère les ports)
preload.js       — bridge sécurisé contextBridge
modeling-studio/ — submodule git (app web + serveur complets)
server-deps/     — dépendances npm du serveur, isolées pour le packaging (voir ci-dessus)
assets/          — icônes (icon.ico, icon.icns, icon.png)
```

## Mise à jour du submodule

```bash
git submodule update --remote --merge
git add modeling-studio
git commit -m "chore: bump modeling-studio submodule"
```

## Version et publication d'une release

La version affichée aux utilisateurs vient du tag Git créé sur **modeling-studio-releases**, pas directement de ce repo. Avant de publier une nouvelle release :

1. Mettre à jour `"version"` dans `package.json` de ce repo (actuellement `1.0.0` — champ interne, utilisé par electron-builder pour nommer l'exe)
2. Builder avec `npm run dist:win`
3. Publier le binaire (`dist-electron/Modeling & Simulation Studio <version>.exe`) sur **[modeling-studio-releases](https://github.com/niko63/modeling-studio-releases/releases)** avec un nouveau tag (ex. `v1.0.4`) et les notes de version
4. Vérifier que le README de `modeling-studio-releases` reste à jour (c'est la page que voient les utilisateurs)

## Différences vs version web

- Pas de collaboration multi-utilisateur (chaque instance est locale)
- Les fichiers JSON sont stockés localement dans `resources/models/`
- Le serveur Node.js démarre automatiquement en arrière-plan
- Fonctionne hors réseau
