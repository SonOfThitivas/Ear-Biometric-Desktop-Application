import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { connectDB } from './database';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { runDatabaseTests } from './test_db';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- TYPE DEFINITIONS ---


// --- APP STARTUP ---

app.whenReady().then(async () => {
  await connectDB();

  await runDatabaseTests();

  // --- IPC HANDLERS ---

});