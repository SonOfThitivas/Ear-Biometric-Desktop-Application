import React from "react";
import useCameraSocket from "../hooks/useCameraSocket";
import { Image } from "@mantine/core";

export default function CameraPage() {
  const {
    cameraData,
    cameraStatus,
    startCamera,
    stopCamera,
    capture,
  } = useCameraSocket();

  return (
    <div style={{ padding: "20px" }}>
      <h1>3D Scanner Controller</h1>

      <p>Status: {cameraStatus.running ? "Running" : "Stopped"}</p>

      <button onClick={startCamera}>Start Camera</button>
      <button onClick={stopCamera}>Stop Camera</button>
      <button onClick={capture}>Capture Image</button>

      <hr />

      <h2>Live Data</h2>
      <pre>{cameraData ? JSON.stringify(cameraData, null, 2) : "No data yet"}</pre>
      {/* <Image src={`data:image/jpeg;base64,${cameraData.image}`}/> */}
        {cameraData?.image && (
        <Image src={`data:image/jpeg;base64,${cameraData.image}`} alt="live" />
        )} 

    </div>
  );
}
