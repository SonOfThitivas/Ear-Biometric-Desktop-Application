// Helper to simplify fetch calls
const BASE_URL = '/api';

async function post(endpoint: string, body: any) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`POST ${endpoint} failed:`, error);
        return { success: false, error: String(error) };
    }
}

async function put(endpoint: string, body: any) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

async function del(endpoint: string, body: any) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

async function get(endpoint: string) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`GET ${endpoint} failed:`, error);
        return null;
    }
}

// ==================================================================
// THE WEB API OBJECT (Replaces window.electronAPI)
// ==================================================================

export const webAPI = {
    // --- System ---
    connectDB: async () => {
        // On web, we just check if the API is alive
        return await get('/connect');
    },
    
    beep: async () => {
        console.log("🔔 Beep (Browser Mode)");
        // Browsers block random sounds, so we just log it
        return Promise.resolve();
    },

    // --- Auth ---
    loginOperator: async (username: string, password: string) => {
        return await post('/auth/login', { username, password });
    },

    // --- Search ---
    searchByHN: async (hn: string) => {
        return await get(`/search/hn/${hn}`) || [];
    },

    searchByFirstname: async (name: string) => {
        return await get(`/search/firstname/${name}`) || [];
    },

    searchByLastname: async (name: string) => {
        return await get(`/search/lastname/${name}`) || [];
    },

    searchMultiCriteria: async (hn: string, f: string, l: string) => {
        return await post('/search/multi', { hn, firstname: f, lastname: l }) || [];
    },

    getChildByHN: async (hn: string) => {
        return await get(`/child/${hn}`);
    },

    getParentByHN: async (hn: string) => {
        return await get(`/parent/${hn}`);
    },

    // --- Inserts ---
    insertChild: async (data: any, op_number: string) => {
        return await post('/insert/child', { data, op_number });
    },

    insertParent: async (data: any, op_number: string) => {
        return await post('/insert/parent', { data, op_number });
    },

    // --- Updates ---
    updateChild: async (hn: string, data: any, op_number: string) => {
        return await put('/update/child', { hn, data, op_number });
    },

    updateParent: async (hn: string, data: any, op_number: string) => {
        return await put('/update/parent', { hn, data, op_number });
    },

    // --- Deletes / Deactivation ---
    deactivateChild: async (hn: string, op_number: string) => {
        return await post('/deactivate/child', { hn, op_number });
    },

    deactivateParent: async (hn: string, op_number: string) => {
        return await post('/deactivate/parent', { hn, op_number });
    },

    hardDeleteChild: async (hn: string, op_number: string) => {
        return await del('/delete/child', { hn, op_number });
    },

    hardDeleteParent: async (hn: string, op_number: string) => {
        return await del('/delete/parent', { hn, op_number });
    },

    // --- Vectors ---
    insertChildVectors: async (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => {
        return await post('/vectors/child', { hn, v1, v2, v3, folder, op_number });
    },

    insertParentVectors: async (hn: string, v1: number[], v2: number[], v3: number[], folder: string, op_number: string) => {
        return await post('/vectors/parent', { hn, v1, v2, v3, folder, op_number });
    },

    findClosestChild: async (vector: number[]) => {
        return await post('/find/closest-child', { vector });
    },

    findClosestParent: async (vector: number[]) => {
        return await post('/find/closest-parent', { vector });
    },

    // --- Linking ---
    linkParentChild: async (parent_hn: string, child_hn: string) => {
        return await post('/link', { parent_hn, child_hn });
    },

    unlinkParentChild: async (parent_hn: string, child_hn: string, op_number: string) => {
        return await post('/unlink', { parent_hn, child_hn, op_number });
    },
};