# Modeling & Simulation Studio — Desktop

Packaging Electron de [modeling-studio](https://github.com/niko63/modeling-studio).

## Prérequis

- Node.js 18+ **doit être installé sur la machine** : https://nodejs.org/en/download
  - Télécharger la version LTS (Long Term Support)
  - Windows : choisir l'installeur `.msi` et suivre les étapes
  - Vérifier l'installation : ouvrir un terminal et taper `node --version`

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
npm run dist:win    # Windows (.exe NSIS)
npm run dist:mac    # macOS (.dmg)
npm run dist:linux  # Linux (.AppImage)
```

Le résultat est dans `dist-electron/`.

## Architecture

```
main.js          — processus principal Electron
preload.js       — bridge sécurisé contextBridge
modeling-studio/ — submodule git (app web complète)
assets/          — icônes (icon.ico, icon.icns, icon.png)
```

## Mise à jour du submodule

```bash
git submodule update --remote --merge
git add modeling-studio
git commit -m "chore: bump modeling-studio submodule"
```

## Différences vs version web

- Pas de collaboration multi-utilisateur (chaque instance est locale)
- Les fichiers JSON sont stockés localement dans `resources/models/`
- Le serveur Node.js démarre automatiquement en arrière-plan
- Fonctionne hors réseau
