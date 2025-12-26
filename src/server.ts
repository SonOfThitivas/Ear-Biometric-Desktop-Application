import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Configuration ---
// Serve the index.html file for the root URL
app.get('/', (req, res) => {
    // In Electron production, __dirname points to the bundled file location
    res.sendFile(path.join(__dirname, "../renderer/main_window/index.html"));
});

// --- Python Process Management ---
let cameraProcess: any = null;

// !!! IMPORTANT: UPDATE THIS PATH TO YOUR PYTHON EXECUTABLE !!!
// Use double backslashes (\\) for Windows paths.
const pythonCommand = import.meta.env.VITE_PATH_PYTHON_ENV;

function startCamera() {
    // Prevent starting multiple instances
    if (cameraProcess) return;

    console.log("Starting Python Camera Script...");
    // When packaged, we need to make sure we find the python script correctly
    // Depending on how you pack files, you might need path.join(process.resourcesPath, 'src/camera.py')
    // For now, we assume it's in the same relative location or unpacked.
    const scriptPath = import.meta.env.VITE_PATH_CAMERAPY; 
    console.log("Script Path:", scriptPath);
    
    // Spawn the Python process with unbuffered output (-u)
    cameraProcess = spawn(pythonCommand, ['-u', scriptPath]);

    // Listen for data from Python (stdout)
    cameraProcess.stdout.on('data', (data: any) => {
        const str = data.toString().trim();
        // Split data by newlines in case multiple JSON objects come together
        const lines = str.split('\n');
        
        lines.forEach((line: string) => {
            try {
                if(!line) return;
                const jsonData = JSON.parse(line);
                // Broadcast data to all connected web clients
                io.emit('camera-data', jsonData);
            } catch (e) {
                // Ignore parsing errors (e.g., incomplete JSON chunks)
            }
        });
    });

    // Listen for errors from Python (stderr)
    cameraProcess.stderr.on('data', (data: any) => {
        console.error(`Python Error: ${data}`);
    });

    // Handle Python process exit
    cameraProcess.on('close', (code: any) => {
        console.log(`Camera process exited with code ${code}`);
        cameraProcess = null;
        io.emit('camera-status', { running: false });
    });

    // Notify frontend that camera is starting
    io.emit('camera-status', { running: true });
}

function stopCamera() {
    if (cameraProcess) {
        cameraProcess.kill(); // Kill the process
        cameraProcess = null;
        console.log("Stopped Camera.");
    }
}

// Send "save" command to Python via Standard Input (stdin)
function captureImage(data: any = {}) {
    if (!cameraProcess) return;

    const payload = {
        cmd: "save",
        hn: data.hn || null,
        mode: data.mode || null
    };

    cameraProcess.stdin.write(JSON.stringify(payload) + "\n");
    console.log("Sent capture command to Python:", payload);
}


// --- Socket.IO Handling ---
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('command', (data) => {
        // ✅ If frontend sends a string (old behavior)
        if (typeof data === "string") {
            if (data === "START") return startCamera();
            if (data === "STOP") return stopCamera();
            if (data === "CAPTURE") return captureImage({});
            return;
        }

        // ✅ If frontend sends an object (new behavior)
        if (data.cmd === "START") return startCamera();
        if (data.cmd === "STOP") return stopCamera();
        if (data.cmd === "CAPTURE") return captureImage(data);
    });
});


// --- Start Server ---
// Listen on all network interfaces (0.0.0.0) so other devices can connect
server.listen(3000, '0.0.0.0', () => {
    console.log('Server running at http://localhost:3000');
});