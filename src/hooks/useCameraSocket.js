import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useCameraSocket() {
    const [socket, setSocket] = useState(null);
    const [cameraData, setCameraData] = useState(null);
    const [cameraStatus, setCameraStatus] = useState({ running: false });
    const [captureResult, setCaptureResult] = useState(null);

    useEffect(() => {
        // Connect to backend
        const s = io("http://localhost:3000", {
        transports: ["websocket"],
        });

        setSocket(s);

        // Receive frame/data from Python
        s.on("camera-data", (data) => {
            setCameraData(data);

            if (data.event === "saved") {
                setCaptureResult({
                    folder: data.folder,
                    embedding: data.embedding
                });
            }
        });


        // Running / stopped status
        s.on("camera-status", (status) => {
        setCameraStatus(status);
        });

        // Cleanup on component unmount
        return () => s.disconnect();
    }, []);

    // Helper functions
    const sendCommand = (cmd, payload = {}) => {
        if (socket) socket.emit("command", { cmd, ...payload });
    };


    return {
        cameraData,
        cameraStatus,
        captureResult,
        startCamera: () => sendCommand("START"),
        stopCamera: () => sendCommand("STOP"),
        capture: (hn, mode) => sendCommand("CAPTURE", { hn, mode }),
    };
}
