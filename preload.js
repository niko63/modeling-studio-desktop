/**
 * preload.js — Bridge sécurisé Electron ↔ React
 *
 * Expose uniquement les APIs nécessaires au renderer,
 * sans activer nodeIntegration (sécurité Electron).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Version de l'app
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Ouvrir un fichier (pour import XMI/JSON)
  openFile: (filters) => ipcRenderer.invoke('open-file', filters),

  // Sauvegarder un fichier (pour export)
  saveFile: (filters, defaultName) => ipcRenderer.invoke('save-file', filters, defaultName),

  // Infos plateforme
  platform: process.platform,
});
