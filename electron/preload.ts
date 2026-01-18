import { contextBridge, ipcRenderer } from 'electron';

// Type for project files
interface ProjectFile {
  path: string;
  content: string;
  size: number;
}

interface FileTreeEntry {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory/file selection
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('select-files', options || {}),

  // Project file reading
  readProjectFiles: (projectPath: string, maxFiles?: number) =>
    ipcRenderer.invoke('read-project-files', projectPath, maxFiles),
  getFileTree: (projectPath: string) =>
    ipcRenderer.invoke('get-file-tree', projectPath),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),

  // Platform info
  platform: process.platform,

  // Claude API (via main process)
  callClaude: (options: {
    apiKey: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    model?: string;
    maxTokens?: number;
    system?: string;
  }) => ipcRenderer.invoke('call-claude', options),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string | null>;
      selectFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string[]>;
      readProjectFiles: (projectPath: string, maxFiles?: number) => Promise<ProjectFile[]>;
      getFileTree: (projectPath: string) => Promise<FileTreeEntry[]>;
      readFile: (filePath: string) => Promise<string | null>;
      platform: NodeJS.Platform;
      callClaude: (options: {
        apiKey: string;
        messages: { role: 'user' | 'assistant'; content: string }[];
        model?: string;
        maxTokens?: number;
        system?: string;
      }) => Promise<string>;
    };
  }
}
