import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  
  // Auth
  loginOperator: (username: string, password: string) => ipcRenderer.invoke('db:login-operator', { username, password }),
  
  // Search
  searchByHN: (hn: string) => ipcRenderer.invoke('db:search-hn', hn),
  searchByFirstname: (name: string) => ipcRenderer.invoke('db:search-firstname', name),
  searchByLastname: (name: string) => ipcRenderer.invoke('db:search-lastname', name),
  searchMultiCriteria: (hn: string, f: string, l: string) => ipcRenderer.invoke('db:search-multi', { hn, firstname: f, lastname: l }),
  
  // Delete
  deactivateChild: (hn: string, op_number: string) => ipcRenderer.invoke('db:deactivate-child', { hn, op_number }),
  deactivateParent: (hn: string, op_number: string) => ipcRenderer.invoke('db:deactivate-parent', { hn, op_number }),
  hardDeleteChild: (hn: string, op_number: string) => ipcRenderer.invoke('db:hard-delete-child', { hn, op_number }),
  hardDeleteParent: (hn: string, op_number: string) => ipcRenderer.invoke('db:hard-delete-parent', { hn, op_number }),
  
  // Vectors
  insertChildVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => 
    ipcRenderer.invoke('db:insert-child-vectors', { hn, v1, v2, v3, folder, op_number }),

  insertParentVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => 
    ipcRenderer.invoke('db:insert-parent-vectors', { hn, v1, v2, v3, folder, op_number }),

  findClosestChild: (vector: number[]) => ipcRenderer.invoke("findClosestChild", vector),
  findClosestParent: (vector: number[]) => ipcRenderer.invoke("findClosestParent", vector),

  // Relations
  linkParentChild: (parent_hn: string, child_hn: string) => 
      ipcRenderer.invoke('db:link-parent-child', { parent_hn, child_hn }),

  unlinkParentChild: (parent_hn: string, child_hn: string, op_number: string) => 
      ipcRenderer.invoke('db:unlink-parent-child', { parent_hn, child_hn, op_number }),

  // Insert
  insertChild: (data: any, op_number: string) => ipcRenderer.invoke('db:insert-child', { data, op_number }),
  insertParent: (data: any, op_number: string) => ipcRenderer.invoke('db:insert-parent', { data, op_number }),
});