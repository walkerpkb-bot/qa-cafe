import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory/file selection
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('select-files', options || {}),

  // Platform info
  platform: process.platform,
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string | null>;
      selectFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string[]>;
      platform: NodeJS.Platform;
    };
  }
}
