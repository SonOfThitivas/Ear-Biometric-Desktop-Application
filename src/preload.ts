// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  
  // NEW Function
  loginOperator: (username: string, password: string) => ipcRenderer.invoke('db:login-operator', { username, password }),
  searchByHN: (hn: string) => ipcRenderer.invoke('db:search-hn', hn),
  searchByFirstname: (name: string) => ipcRenderer.invoke('db:search-firstname', name),
  searchByLastname: (name: string) => ipcRenderer.invoke('db:search-lastname', name),
  searchMultiCriteria: (hn: string, f: string, l: string) => ipcRenderer.invoke('db:search-multi', { hn, firstname: f, lastname: l }),
  deactivateChild: (hn: string) => ipcRenderer.invoke('db:deactivate-child', hn),
  deactivateParent: (hn: string) => ipcRenderer.invoke('db:deactivate-parent', hn),
  hardDeleteChild: (hn: string) => ipcRenderer.invoke('db:hard-delete-child', hn),
  hardDeleteParent: (hn: string) => ipcRenderer.invoke('db:hard-delete-parent', hn),
  identifyPerson: (vector: number[]) => ipcRenderer.invoke('db:identify-person', vector),
});
