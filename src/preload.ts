// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  
  // NEW Function
  loginOperator: (username: string, password: string) => ipcRenderer.invoke('db:login-operator', { username, password }),
  searchByHN: (hn: string) => ipcRenderer.invoke('db:search-hn', hn),
  searchByFirstname: (name: string) => ipcRenderer.invoke('db:search-firstname', name),
  searchByLastname: (name: string) => ipcRenderer.invoke('db:search-lastname', name),
});
