import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent} from 'electron';
import { connectDB, getRelationsByHN, getRelationsByName, getAllPatients } from './database';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
//   mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Define the shape of the data you expect
interface UserPayload {
  name: string;
  data: any; // Replace 'any' with your actual biometric type if you have one
}

// 1. Connect to DB when App Starts
app.whenReady().then(async () => {
  await connectDB();
  // createWindow(); // Your existing window creation function
  
  // 2. Set up IPC Handlers (Listening for React)

  ipcMain.handle('db:get-by-hn', async (_event : IpcMainInvokeEvent, hn: string) => {
    console.log(`📥 [Main IPC] Received request for HN: ${hn}`); // Debug Log
    const result = await getRelationsByHN(hn);
    console.log(`out [Main IPC] Sending back ${result.length} records`); // Debug Log
    return result;
  });

  ipcMain.handle('db:get-by-name', async (_event : IpcMainInvokeEvent, name: string) => {
    console.log(`📥 [Main IPC] Received request for Name: ${name}`); // Debug Log
    const result = await getRelationsByName(name);
    console.log(`out [Main IPC] Sending back ${result.length} records`); // Debug Log
    return result;
  });

  ipcMain.handle('db:get-all-patients', async (_event: IpcMainInvokeEvent) => {
    console.log("📥 [Main IPC] Received request for ALL patients"); // Debug Log
    return await getAllPatients();
  });
});
