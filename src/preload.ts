import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    beep: () => ipcRenderer.invoke("beep"),
});