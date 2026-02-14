import './index.css';
import './app';
// 1. Import your existing interface
import IRecord from './interface/IRecord'; 

export interface IElectronAPI {
    connectDB: () => Promise<{success: boolean, message?: string}>;
    beep: () => Promise<void>;
    loginOperator: (username: string, password: string) => Promise<{ success: boolean, op_number?: string, role?: string, message?: string }>;
  
    // Search
    searchByHN: (hn: string) => Promise<any[]>;
    searchByFirstname: (name: string) => Promise<any[]>;
    searchByLastname: (name: string) => Promise<any[]>;
    searchMultiCriteria: (hn: string, fname: string, lname: string) => Promise<any[]>;

    // Delete / Status
    deactivateChild: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    deactivateParent: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    hardDeleteChild: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    hardDeleteParent: (hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;

    // Vectors
    insertChildVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => Promise<{ success: boolean; error?: string }>;
    insertParentVectors: (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => Promise<{ success: boolean; error?: string }>;
    findClosestChild: (vector: number[]) => Promise<{ hn?: string; distance?: number } | null>;
    findClosestParent: (vector: number[]) => Promise<{ hn?: string; distance?: number } | null>;

    // Relations
    linkParentChild: (parent_hn: string, child_hn: string) => Promise<{ success: boolean; error?: string }>;
    unlinkParentChild: (parent_hn: string, child_hn: string, op_number: string) => Promise<{ success: boolean; message?: string; error?: string }>;

    // Insert
    // We reuse IRecord here. 
    // Note: The backend expects 'hn' to be part of the data object for Insert, 
    // but passed separately for Update.
    insertChild: (data: IRecord, op_number: string) => Promise<{ success: boolean; error?: string }>;
    insertParent: (data: IRecord, op_number: string) => Promise<{ success: boolean; error?: string }>;

    // Update
    updateChild: (
        hn: string, 
        data: IRecord, // Reusing IRecord ensures we can pass any of the new fields (address, etc)
        op_number: string
    ) => Promise<{ success: boolean; message?: string; error?: string }>;

    updateParent: (
        hn: string, 
        data: IRecord, 
        op_number: string
    ) => Promise<{ success: boolean; message?: string; error?: string }>;

    getChildByHN: (hn: string) => Promise<any>; 
    getParentByHN: (hn: string) => Promise<any>; 
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}