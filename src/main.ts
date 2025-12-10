import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { connectDB, getRelationsByHN, getRelationsByName, getAllPatients, getAllRelations, registerPatientPair } from './database';
import path from 'node:path';
import started from 'electron-squirrel-startup';

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

// 1. PatientData: What the Frontend sends (Age allows empty string)
interface PatientData {
  hn: string;
  firstname: string;
  lastname: string;
  age: number | ''; 
  sex: string;
  dob: Date | null;
}

// 2. RegistryData: What the Database expects (Age MUST be number)
interface RegistryData {
  hn: string;
  firstname: string;
  lastname: string;
  age: number;
  sex: string;
  dob: Date | null;
}

interface RegisterPayload {
  child: PatientData;
  parent: PatientData;
}

// --- APP STARTUP ---

app.whenReady().then(async () => {
  await connectDB();

  // --- IPC HANDLERS ---

  ipcMain.handle('db:get-by-hn', async (_event: IpcMainInvokeEvent, hn: string) => {
    return await getRelationsByHN(hn);
  });

  ipcMain.handle('db:get-by-name', async (_event: IpcMainInvokeEvent, name: string) => {
    return await getRelationsByName(name);
  });

  ipcMain.handle('db:get-all-patients', async (_event: IpcMainInvokeEvent) => {
    return await getAllPatients();
  });

  ipcMain.handle('db:get-all-relations', async (_event: IpcMainInvokeEvent) => {
    return await getAllRelations();
  });

  // --- FIX IS HERE 👇 ---
  ipcMain.handle('db:register-patient-pair', async (_event: IpcMainInvokeEvent, { child, parent }: RegisterPayload) => {
    
    // Converter function: Turns 'PatientData' (frontend) into 'RegistryData' (backend)
    // If age is "", convert it to 0.
    const sanitize = (p: PatientData): RegistryData => ({
      hn: p.hn,
      firstname: p.firstname,
      lastname: p.lastname,
      sex: p.sex,
      dob: p.dob,
      age: p.age === '' ? 0 : Number(p.age) // Force conversion to number
    });

    // Pass the SANITIZED data to the database function
    return await registerPatientPair(sanitize(child), sanitize(parent));
  });

});