// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getByHN: (hn: string) => ipcRenderer.invoke('db:get-by-hn', hn),
  getByName: (name: string) => ipcRenderer.invoke('db:get-by-name', name),
  getAllPatients: () => ipcRenderer.invoke('db:get-all-patients'),
  getAllRelations: () => ipcRenderer.invoke('db:get-all-relations'),
});