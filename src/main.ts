import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as db from './database';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import "./server.js"

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

app.whenReady().then(async () => {
  await db.connectDB();

  // --- SELECTS ---
  ipcMain.handle('db:get-active-children', async () => {
    return await db.getAllActiveChildren();
  });

  ipcMain.handle('db:search-firstname', async (_event, firstname: string) => {
    return await db.searchByFirstname(firstname);
  });

  ipcMain.handle('db:search-hn', async (_event, hn: string) => {
    return await db.searchByHN(hn);
  });

  ipcMain.handle('db:search-lastname', async (_event, lastname: string) => {
    return await db.searchByLastname(lastname);
  });

  ipcMain.handle('db:search-multi', async (_event, { hn, firstname, lastname }) => {
    return await db.searchMultiCriteria(hn, firstname, lastname);
  });

  // --- INSERTS (Destructuring fixed) ---
  ipcMain.handle('db:insert-child', async (_event, { data, op_number }) => {
    return await db.insertChild(data, op_number);
  });

  ipcMain.handle('db:insert-parent', async (_event, { data, op_number }) => {
    return await db.insertParent(data, op_number);
  });

  ipcMain.handle('db:insert-operator', async (_event, data: any) => {
    return await db.insertOperator(data);
  });

  // --- VECTORS ---
  ipcMain.handle('db:insert-child-vectors', async (_event, { hn, v1, v2, v3, folder, op_number }) => {
    return await db.insertChildVectors(hn, v1, v2, v3, folder, op_number);
  });

  ipcMain.handle('db:insert-parent-vectors', async (_event, { hn, v1, v2, v3, folder, op_number }) => {
    return await db.insertParentVectors(hn, v1, v2, v3, folder, op_number);
  });

  ipcMain.handle("findClosestChild", async (_event, vector: number[]) => {
      return await db.findClosestChild(vector);
  });

  ipcMain.handle("findClosestParent", async (_event, vector: number[]) => {
      return await db.findClosestParent(vector);
  });

  // --- LINKING ---
  ipcMain.handle('db:link-parent-child', async (_event, { parent_hn, child_hn }) => {
    return await db.linkParentChild(parent_hn, child_hn);
  });

  ipcMain.handle('db:unlink-parent-child', async (_event, { parent_hn, child_hn, op_number }) => {
    return await db.unlinkParentChild(parent_hn, child_hn, op_number);
  });

  // --- DELETE / STATUS (Destructuring fixed) ---
  ipcMain.handle('db:deactivate-child', async (_event, { hn, op_number }) => {
    return await db.deactivateChild(hn, op_number);
  });

  ipcMain.handle('db:deactivate-parent', async (_event, { hn, op_number }) => {
    return await db.deactivateParent(hn, op_number);
  });

  ipcMain.handle('db:hard-delete-child', async (_event, { hn, op_number }) => {
    return await db.hardDeleteChild(hn, op_number);
  });

  ipcMain.handle('db:hard-delete-parent', async (_event, { hn, op_number }) => {
    return await db.hardDeleteParent(hn, op_number);
  });

  // --- AUTH ---
  ipcMain.handle('db:login-operator', async (_event, { username, password }) => {
    return await db.loginOperator(username, password);
  });
});