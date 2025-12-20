import './index.css';
import './app';

export interface IElectronAPI {
  loginOperator: (username: string, password: string) => Promise<{ success: boolean, op_number?: string, role?: string, message?: string }>;
  
  searchByHN: (hn: string) => Promise<any[]>;
  searchByFirstname: (name: string) => Promise<any[]>;
  searchByLastname: (name: string) => Promise<any[]>;
  searchMultiCriteria: (hn: string, fname: string, lname: string) => Promise<any[]>;

  deactivateChild: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  deactivateParent: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  
  hardDeleteChild: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  hardDeleteParent: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;

  insertChildVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => Promise<{ success: boolean; error?: string }>;
  insertParentVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => Promise<{ success: boolean; error?: string }>;
  
  linkParentChild: (parent_hn: string, child_hn: string) => Promise<{ success: boolean; error?: string }>;
  
  unlinkParentChild: (parent_hn: string, child_hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;

  findClosestChild: (vector: number[]) => Promise<{ hn?: string; distance?: number } | null>;
  findClosestParent: (vector: number[]) => Promise<{ hn?: string; distance?: number } | null>;

  insertChild: (data: any, op_number: string) => Promise<{ success: boolean; error?: string }>;
  insertParent: (data: any, op_number: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}