import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import * as db from './database';

// Load environment variables
dotenv.config();

const app = express();

// @ts-ignore
const server = http.createServer(app);

// 1. Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies (increased limit for images/vectors)

// 2. Socket.IO Setup (Keep existing logic)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ==================================================================
// 3. API ENDPOINTS (Replacements for ipcMain handlers)
// ==================================================================

// --- SYSTEM ---
app.get('/api/connect', async (req: Request, res: Response) => {
    const result = await db.connectDB();
    res.json(result);
});

app.get('/api/beep', (req: Request, res: Response) => {
    // Shell beep doesn't work on a remote server, just return success
    console.log("🔔 [Server] Beep requested");
    res.json({ success: true });
});

// --- AUTH ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const result = await db.loginOperator(username, password);
    res.json(result);
});

// --- SELECTS ---
app.get('/api/children/active', async (req: Request, res: Response) => {
    const result = await db.getAllActiveChildren();
    res.json(result);
});

app.get('/api/search/firstname/:name', async (req: Request, res: Response) => {
    const result = await db.searchByFirstname(req.params.name);
    res.json(result);
});

app.get('/api/search/lastname/:name', async (req: Request, res: Response) => {
    const result = await db.searchByLastname(req.params.name);
    res.json(result);
});

app.get('/api/search/hn/:hn', async (req: Request, res: Response) => {
    const result = await db.searchByHN(req.params.hn);
    res.json(result);
});

app.post('/api/search/multi', async (req: Request, res: Response) => {
    const { hn, firstname, lastname } = req.body;
    const result = await db.searchMultiCriteria(hn, firstname, lastname);
    res.json(result);
});

app.get('/api/child/:hn', async (req: Request, res: Response) => {
    const result = await db.getChildByHN(req.params.hn);
    res.json(result);
});

app.get('/api/parent/:hn', async (req: Request, res: Response) => {
    const result = await db.getParentByHN(req.params.hn);
    res.json(result);
});

// --- INSERTS ---
app.post('/api/insert/child', async (req: Request, res: Response) => {
    const { data, op_number } = req.body;
    const result = await db.insertChild(data, op_number);
    res.json(result);
});

app.post('/api/insert/parent', async (req: Request, res: Response) => {
    const { data, op_number } = req.body;
    const result = await db.insertParent(data, op_number);
    res.json(result);
});

app.post('/api/insert/operator', async (req: Request, res: Response) => {
    const { data } = req.body;
    const result = await db.insertOperator(data);
    res.json(result);
});

// --- VECTORS ---
app.post('/api/vectors/child', async (req: Request, res: Response) => {
    const { hn, v1, v2, v3, folder, op_number } = req.body;
    const result = await db.insertChildVectors(hn, v1, v2, v3, folder, op_number);
    res.json(result);
});

app.post('/api/vectors/parent', async (req: Request, res: Response) => {
    const { hn, v1, v2, v3, folder, op_number } = req.body;
    const result = await db.insertParentVectors(hn, v1, v2, v3, folder, op_number);
    res.json(result);
});

app.post('/api/find/closest-child', async (req: Request, res: Response) => {
    const { vector } = req.body;
    const result = await db.findClosestChild(vector);
    res.json(result);
});

app.post('/api/find/closest-parent', async (req: Request, res: Response) => {
    const { vector } = req.body;
    const result = await db.findClosestParent(vector);
    res.json(result);
});

// --- LINKING ---
app.post('/api/link', async (req: Request, res: Response) => {
    const { parent_hn, child_hn } = req.body;
    const result = await db.linkParentChild(parent_hn, child_hn);
    res.json(result);
});

app.post('/api/unlink', async (req: Request, res: Response) => {
    const { parent_hn, child_hn, op_number } = req.body;
    const result = await db.unlinkParentChild(parent_hn, child_hn, op_number);
    res.json(result);
});

// --- UPDATES ---
app.put('/api/update/child', async (req: Request, res: Response) => {
    const { hn, data, op_number } = req.body;
    const result = await db.updateChild(hn, data, op_number);
    res.json(result);
});

app.put('/api/update/parent', async (req: Request, res: Response) => {
    const { hn, data, op_number } = req.body;
    const result = await db.updateParent(hn, data, op_number);
    res.json(result);
});

// --- DELETES / DEACTIVATION ---
app.post('/api/deactivate/child', async (req: Request, res: Response) => {
    const { hn, op_number } = req.body;
    const result = await db.deactivateChild(hn, op_number);
    res.json(result);
});

app.post('/api/deactivate/parent', async (req: Request, res: Response) => {
    const { hn, op_number } = req.body;
    const result = await db.deactivateParent(hn, op_number);
    res.json(result);
});

app.delete('/api/delete/child', async (req: Request, res: Response) => {
    const { hn, op_number } = req.body;
    const result = await db.hardDeleteChild(hn, op_number);
    res.json(result);
});

app.delete('/api/delete/parent', async (req: Request, res: Response) => {
    const { hn, op_number } = req.body;
    const result = await db.hardDeleteParent(hn, op_number);
    res.json(result);
});


// ==================================================================
// 4. PYTHON PROCESS MANAGEMENT (DISABLED FOR WEB)
// ==================================================================
let cameraProcess: any = null;

// Use process.env for Node.js environment
const pythonCommand = process.env.PYTHON_PATH || 'python3';
const scriptPath = process.env.CAMERA_SCRIPT_PATH || path.join(__dirname, 'camera-no-ai.py');

function startCamera() {
    // -------------------------------------------------------------
    // 🛑 WEB VERSION MODIFICATION: 
    // We intentionally disable the Python Camera spawn here.
    // The server cannot access the client's USB camera.
    // -------------------------------------------------------------
    
    console.log("⚠️ [Server] Camera start requested, but this is the Web Version.");
    console.log("⚠️ [Server] Skipping Python script execution to prevent crash.");

    // Mock a status update so the frontend doesn't hang forever
    io.emit('camera-status', { running: false, message: "Camera disabled on Web" });
    
    // --- ORIGINAL CODE COMMENTED OUT BELOW ---
    /*
    if (cameraProcess) return;

    console.log(`[Python] Starting script: ${pythonCommand} ${scriptPath}`);
    
    // Spawn Python
    cameraProcess = spawn(pythonCommand, ['-u', scriptPath]);

    cameraProcess.stdout.on('data', (data: any) => {
        const str = data.toString().trim();
        const lines = str.split('\n');
        
        lines.forEach((line: string) => {
            try {
                if(!line) {
                    io.emit('camera-status', { running: false });
                    return
                };
                const jsonData = JSON.parse(line);
                io.emit('camera-data', jsonData);
                // Notify frontend that camera is starting
                io.emit('camera-status', { running: true });
            } catch (e) {
<<<<<<< HEAD
                // Ignore incomplete JSON chunks
=======
                // Ignore parsing errors (e.g., incomplete JSON chunks)
                io.emit('camera-status', { running: false });
>>>>>>> 0a4b08c47174dbc427a392aca76705b643ecc06d
            }
        });
    });

    cameraProcess.stderr.on('data', (data: any) => {
        console.error(`[Python Error] ${data}`);
    });

    cameraProcess.on('close', (code: any) => {
        console.log(`[Python] Exited with code ${code}`);
        cameraProcess = null;
        io.emit('camera-status', { running: false });
    });

<<<<<<< HEAD
    io.emit('camera-status', { running: true });
    */
=======
>>>>>>> 0a4b08c47174dbc427a392aca76705b643ecc06d
}

function stopCamera() {
    if (cameraProcess) {
        cameraProcess.kill();
        cameraProcess = null;
        console.log("[Python] Stopped Camera.");
    } else {
        console.log("[Server] Stop requested, but no camera process is running.");
    }
}

function captureImage(data: any = {}) {
    // 🛑 Disable capture logic too
    console.log("[Server] Capture requested (Ignored in Web Version)");
    
    /*
    if (!cameraProcess) return;
    const payload = {
        cmd: "save",
        hn: data.hn || null,
        mode: data.mode || null
    };
    cameraProcess.stdin.write(JSON.stringify(payload) + "\n");
    console.log("[Python] Sent capture command:", payload);
    */
}

// ==================================================================
// 5. SOCKET.IO HANDLERS
// ==================================================================
io.on('connection', (socket) => {
    console.log('Client connected to socket');

    socket.on('command', (data) => {
        // Handle legacy string commands
        if (typeof data === "string") {
            if (data === "START") return startCamera();
            if (data === "STOP") return stopCamera();
            if (data === "CAPTURE") return captureImage({});
            return;
        }
        // Handle object commands
        if (data.cmd === "START") return startCamera();
        if (data.cmd === "STOP") return stopCamera();
        if (data.cmd === "CAPTURE") return captureImage(data);
    });
});


// ==================================================================
// 6. SERVE FRONTEND (Production)
// ==================================================================

// The build output is usually in 'dist' (or 'out') one level up
const distPath = path.join(__dirname, '../dist');

// Serve static files
app.use(express.static(distPath));

// Catch-all: Send index.html for any request that isn't an API call
// This supports React Router (client-side routing)
app.get('*', (req: Request, res: Response) => {
    // If the request accepts html, send index.html
    if (req.accepts('html')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        // Otherwise (e.g. 404 on an asset), send 404
        res.status(404).send('Not found');
    }
});

// ==================================================================
// 7. START SERVER
// ==================================================================
const PORT = process.env.PORT || 3000;

// Connect to DB before listening
db.connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ Failed to connect to DB on startup:", err);
    process.exit(1);
});