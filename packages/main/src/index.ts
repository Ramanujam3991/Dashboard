import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { ipcRouter } from './ipc/router';
import { IpcChannel, SecurityGetOverviewRequest } from 'shared';

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload/dist/index.js'),
    },
  });

  // In development, load the Vite dev server URL
  // In production, we would load the compiled index.html
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  // Open DevTools to easily verify window.api is exposed
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  // Initialize IPC Router
  ipcRouter.init();

  // Register a stub handler for testing T1.2
  ipcRouter.register(IpcChannel.SecurityGetOverview, async (req: SecurityGetOverviewRequest) => {
    console.log('[Main] Received SecurityGetOverviewRequest:', req);
    return {
      security: { ticker: req.ticker, name: 'Apple Inc.', price: 150 },
      ourBook: { shortQty: 100 },
      asOf: new Date().toISOString(),
    };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
