import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useCameraSocket() {
    const [socket, setSocket] = useState(null);
    const [cameraData, setCameraData] = useState(null);
    const [cameraStatus, setCameraStatus] = useState({ running: false });

    useEffect(() => {
        // Connect to backend
        const s = io("http://localhost:3000", {
        transports: ["websocket"],
        });

        setSocket(s);

        // Receive frame/data from Python
        s.on("camera-data", (data) => {
        setCameraData(data);
        });

        // Running / stopped status
        s.on("camera-status", (status) => {
        setCameraStatus(status);
        });

        // Cleanup on component unmount
        return () => s.disconnect();
    }, []);

    // Helper functions
    const sendCommand = (cmd) => {
        if (socket) socket.emit("command", cmd);
    };

    return {
        cameraData,
        cameraStatus,
        startCamera: () => sendCommand("START"),
        stopCamera: () => sendCommand("STOP"),
        capture: () => sendCommand("CAPTURE"),
    };
}
