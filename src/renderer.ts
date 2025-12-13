/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import './app';

export interface IElectronAPI {
  // ... existing ...
  
  // NEW
  loginOperator: (username: string, password: string) => Promise<{ success: boolean, op_number?: string,role?: string, message?: string }>;
  searchByHN: (hn: string) => Promise<any[]>;
  searchByFirstname: (name: string) => Promise<any[]>;
  searchByLastname: (name: string) => Promise<any[]>;
  deactivateChild: (hn: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  deactivateParent: (hn: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  
  hardDeleteChild: (hn: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  hardDeleteParent: (hn: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  identifyPerson: (vector: number[]) => Promise<{ 
      success: boolean; 
      hn?: string; 
      distance?: number; // The cosine distance score
      type?: 'child' | 'parent'; // Who did we match?
      message?: string; 
  }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// console.log(
//   '👋 This message is being logged by "renderer.ts", included via Vite',
// );
