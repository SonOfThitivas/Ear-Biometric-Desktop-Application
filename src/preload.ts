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
  insertChildVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string) => 
    ipcRenderer.invoke('db:insert-child-vectors', { hn, v1, v2, v3, folder }),

  insertParentVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string) => 
    ipcRenderer.invoke('db:insert-parent-vectors', { hn, v1, v2, v3, folder }),

  findClosestChild: (vector) => ipcRenderer.invoke("findClosestChild", vector),
  findClosestParent: (vector) => ipcRenderer.invoke("findClosestParent", vector),

});
