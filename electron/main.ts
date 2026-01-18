import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// File extensions to include in code analysis
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.vue', '.svelte',
  '.json', '.yaml', '.yml', '.toml', '.xml',
  '.md', '.txt', '.rst',
  '.html', '.css', '.scss', '.sass', '.less',
  '.sh', '.bash', '.zsh',
  '.sql',
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'build', 'out', 'target',
  '.next', '.nuxt', '.output',
  '__pycache__', '.pytest_cache', '.venv', 'venv',
  'vendor', 'bower_components',
  'coverage', '.nyc_output',
  '.idea', '.vscode',
]);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Open directory picker
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select Project Directory',
  });
  return result.canceled ? null : result.filePaths[0];
});

// Open file picker
ipcMain.handle('select-files', async (_event, options: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    title: 'Select Files',
  });
  return result.canceled ? [] : result.filePaths;
});

// Read project files for analysis
ipcMain.handle('read-project-files', async (_event, projectPath: string, maxFiles = 50) => {
  const files: { path: string; content: string; size: number }[] = [];

  function walkDir(dir: string, depth = 0) {
    if (depth > 10 || files.length >= maxFiles) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            walkDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            try {
              const stats = fs.statSync(fullPath);
              // Skip files larger than 100KB
              if (stats.size < 100 * 1024) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                files.push({
                  path: relativePath,
                  content,
                  size: stats.size,
                });
              }
            } catch (e) {
              // Skip files we can't read
            }
          }
        }
      }
    } catch (e) {
      // Skip directories we can't access
    }
  }

  walkDir(projectPath);
  return files;
});

// Get project file tree (lightweight, no content)
ipcMain.handle('get-file-tree', async (_event, projectPath: string) => {
  const tree: { path: string; type: 'file' | 'dir'; size?: number }[] = [];

  function walkDir(dir: string, depth = 0) {
    if (depth > 8) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            tree.push({ path: relativePath, type: 'dir' });
            walkDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            const stats = fs.statSync(fullPath);
            tree.push({ path: relativePath, type: 'file', size: stats.size });
          }
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walkDir(projectPath);
  return tree;
});

// Read a single file
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
});

// Call Claude API (via main process to avoid CORS)
ipcMain.handle('call-claude', async (_event, options: {
  apiKey: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  system?: string;
}) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 4096,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json() as { content: { type: string; text?: string }[] };
  const textContent = data.content.find((c) => c.type === 'text');
  return textContent?.text || '';
});
