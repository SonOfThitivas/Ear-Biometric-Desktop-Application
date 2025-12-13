import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as db from './database';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { runDatabaseTests } from './test_db';
import { runPermissionTests } from './test_permission'
import { testVectorSearch } from './vector_test';

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
  await db.connectDB();
  // await runDatabaseTests();
  // await runPermissionTests();
  await testVectorSearch();

  ipcMain.handle('db:get-active-children', async () => {
    return await db.getAllActiveChildren();
  });

  ipcMain.handle('db:search-firstname', async (_event: IpcMainInvokeEvent, firstname: string) => {
    return await db.searchByFirstname(firstname);
  });

  ipcMain.handle('db:search-hn', async (_event: IpcMainInvokeEvent, hn: string) => {
    return await db.searchByHN(hn);
  });

  ipcMain.handle('db:search-lastname', async (_event: IpcMainInvokeEvent, lastname: string) => {
    return await db.searchByLastname(lastname);
  });

  // 2. Insert Entities
  ipcMain.handle('db:insert-child', async (_event: IpcMainInvokeEvent, data: any) => {
    return await db.insertChild(data);
  });

  ipcMain.handle('db:insert-parent', async (_event: IpcMainInvokeEvent, data: any) => {
    return await db.insertParent(data);
  });

  ipcMain.handle('db:insert-operator', async (_event: IpcMainInvokeEvent, data: any) => {
    return await db.insertOperator(data);
  });

  // 3. Insert Relations & Vectors
  ipcMain.handle('db:insert-child-vectors', async (_event: IpcMainInvokeEvent, { hn, v1, v2, v3, path }) => {
    return await db.insertChildVectors(hn, v1, v2, v3, path);
  });

  ipcMain.handle('db:insert-parent-vectors', async (_event: IpcMainInvokeEvent, { hn, v1, v2, v3, path }) => {
    return await db.insertParentVectors(hn, v1, v2, v3, path);
  });

  ipcMain.handle('db:link-op-child', async (_event: IpcMainInvokeEvent, { op_number, child_hn }) => {
    return await db.linkOperatorChild(op_number, child_hn);
  });

  ipcMain.handle('db:link-op-parent', async (_event: IpcMainInvokeEvent, { op_number, parent_hn }) => {
    return await db.linkOperatorParent(op_number, parent_hn);
  });

  ipcMain.handle('db:link-parent-child', async (_event: IpcMainInvokeEvent, { parent_hn, child_hn }) => {
    return await db.linkParentChild(parent_hn, child_hn);
  });

  ipcMain.handle('db:log-activity', async (_event: IpcMainInvokeEvent, { op_number, activity }) => {
    return await db.logActivity(op_number, activity);
  });

  // 4. Deactivate (Soft Delete)
  ipcMain.handle('db:deactivate-child', async (_event: IpcMainInvokeEvent, hn: string) => {
    // This could optionally call deactivateChildVectors too
    return await db.deactivateChild(hn);
  });

  ipcMain.handle('db:deactivate-parent', async (_event: IpcMainInvokeEvent, hn: string) => {
    return await db.deactivateParent(hn);
  });

  // 5. Auth
  ipcMain.handle('db:login-operator', async (_event: IpcMainInvokeEvent, { username, password }) => {
    return await db.loginOperator(username, password);
  });

  // --- IPC HANDLERS ---
  ipcMain.handle('db:search-multi', async (_event, { hn, firstname, lastname }) => {
    return await db.searchMultiCriteria(hn, firstname, lastname);
  });

  ipcMain.handle('db:hard-delete-child', async (_event, hn: string) => {
    return await db.hardDeleteChild(hn);
  });

  ipcMain.handle('db:hard-delete-parent', async (_event, hn: string) => {
    return await db.hardDeleteParent(hn);
  });
});
