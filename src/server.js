const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { spawn } = require('child_process');
const path = require('path');

// --- Configuration ---
// Serve the index.html file for the root URL
app.get('/', (req, res) => {
    // console.log(path.join(__dirname, "..", "index.html"))
    // res.sendFile(path.join(__dirname, "..", "index.html"));
    res.sendFile(path.join(__dirname, "index.html"))
});

// Serve the 'saved_images' folder so users can view saved photos (optional)
// app.use('/saved_images', express.static(path.join(__dirname, 'saved_images')));

// --- Python Process Management ---
let cameraProcess = null;

// !!! IMPORTANT: UPDATE THIS PATH TO YOUR PYTHON EXECUTABLE !!!
// Use double backslashes (\\) for Windows paths.
const pythonCommand = 'C:\\Users\\user\\Ear Biometric\\.venv\\Scripts\\python.exe';

function startCamera() {
    // Prevent starting multiple instances
    if (cameraProcess) return;

    console.log("Starting Python Camera Script...");
    const scriptPath = path.join('./src/camera.py');
    console.log(scriptPath)
    
    // Spawn the Python process with unbuffered output (-u)
    cameraProcess = spawn(pythonCommand, ['-u', scriptPath]);

    // Listen for data from Python (stdout)
    cameraProcess.stdout.on('data', (data) => {
        const str = data.toString().trim();
        // Split data by newlines in case multiple JSON objects come together
        const lines = str.split('\n');
        
        lines.forEach(line => {
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
    cameraProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    // Handle Python process exit
    cameraProcess.on('close', (code) => {
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
function captureImage(data = {}) {
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
http.listen(3000, '0.0.0.0', () => {
    console.log('Server running at http://localhost:3000');
});