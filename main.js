/**
 * main.js — Point d'entrée Electron
 *
 * Responsabilités :
 * 1. Lancer le serveur Node.js de modeling-studio en processus fils
 * 2. Créer la fenêtre principale et charger l'app React
 * 3. Gérer le cycle de vie (fermeture, relance serveur)
 */

const { app, BrowserWindow, dialog, shell } = require('electron');
const path   = require('path');
const { fork, spawn } = require('child_process');
const http   = require('http');
const fs     = require('fs');

// ── Constantes ────────────────────────────────────────────────────────────

const isDev     = process.argv.includes('--dev');
const PORT_API  = 4000;
const PORT_DEV  = 5190; // Vite en mode dev uniquement

// En production, les fichiers sont dans resources/
const resourcesPath = isDev
  ? path.join(__dirname, 'modeling-studio')
  : process.resourcesPath;

const serverPath = isDev
  ? path.join(__dirname, 'modeling-studio', 'server', 'server.js')
  : path.join(resourcesPath, 'server', 'server.js');

const webPath = isDev
  ? null  // En dev on pointe vers Vite
  : path.join(resourcesPath, 'web');

const modelsPath = isDev
  ? path.join(__dirname, 'modeling-studio', 'models')
  : path.join(resourcesPath, 'models');

// ── Serveur Node.js ───────────────────────────────────────────────────────

let serverProcess = null;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('[Desktop] Démarrage du serveur sur', serverPath);

    const env = {
      ...process.env,
      PORT:        String(PORT_API),
      MODELS_PATH: modelsPath,
      NODE_ENV:    isDev ? 'development' : 'production',
    };

    serverProcess = fork(serverPath, [], {
      env,
      silent: true,
    });

    serverProcess.stdout?.on('data', d => console.log('[Server]', d.toString().trim()));
    serverProcess.stderr?.on('data', d => console.error('[Server]', d.toString().trim()));

    serverProcess.on('error', err => {
      console.error('[Desktop] Erreur serveur :', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log('[Desktop] Serveur arrêté (code', code, ')');
      serverProcess = null;
    });

    // Attendre que le serveur soit prêt (poll HTTP)
    let attempts = 0;
    const check = () => {
      attempts++;
      http.get(`http://localhost:${PORT_API}/api/health`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log('[Desktop] Serveur prêt après', attempts, 'tentatives');
          resolve();
        } else { setTimeout(check, 200); }
      }).on('error', () => {
        if (attempts < 30) setTimeout(check, 200);
        else reject(new Error('Serveur non démarré après 6s'));
      });
    };
    setTimeout(check, 300);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// ── Fenêtre principale ────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'Modeling & Simulation Studio',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    show: false,
  });

  mainWindow.setMenu(null);

  // Charger l'app
  if (isDev) {
    // En dev : pointer vers Vite (npm run dev dans modeling-studio)
    mainWindow.loadURL(`http://localhost:${PORT_DEV}`);
    //mainWindow.webContents.openDevTools();
  } else {
    // En prod : charger le build statique
    mainWindow.loadFile(path.join(webPath, 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Ouvrir les liens externes dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Cycle de vie Electron ─────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    if (isDev) {
      // En dev le serveur tourne déjà via modeling-studio (npm run server)
      // On vérifie juste qu'il est accessible
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          http.get(`http://localhost:${PORT_API}/api/health`, (res) => {
            resolve();
          }).on('error', () => {
            if (attempts < 15) setTimeout(check, 300);
            else reject(new Error(`Serveur non accessible sur :${PORT_API} — lancez d'abord npm run server dans modeling-studio`));
          });
        };
        check();
      });
    } else {
      await startServer();
    }
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Erreur de démarrage',
      `${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!serverProcess) await startServer();
    createWindow();
  }
});

app.on('before-quit', () => stopServer());

// Empêcher plusieurs instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
