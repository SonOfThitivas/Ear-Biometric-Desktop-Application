import React, { useEffect, useRef, useState } from "react";
import useCameraSocket from "../hooks/useCameraSocket";

export default function Camera({ onInsideZoneChange }) {
  const {
    cameraData,
    cameraStatus,
    startCamera,
    stopCamera,
  } = useCameraSocket();

  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const [insideZone, setInsideZone] = useState(false);

  useEffect(() => {
    if (!cameraData?.image) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const imgWidth = img.clientWidth;
      const imgHeight = img.clientHeight;

      canvas.width = imgWidth;
      canvas.height = imgHeight;

      ctx.clearRect(0, 0, imgWidth, imgHeight);

      // Target zone
      const zoneWidth = imgWidth * 0.25;
      const zoneHeight = imgHeight * 0.5;
      const zoneX = (imgWidth - zoneWidth) / 2;
      const zoneY = (imgHeight - zoneHeight) / 2;

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight);

      // YOLO bbox
      const bbox = cameraData.bbox;
      let inside = false;

      if (bbox) {
        const scaleX = imgWidth / 640;
        const scaleY = imgHeight / 480;

        const bx1 = bbox.x1 * scaleX;
        const by1 = bbox.y1 * scaleY;
        const bx2 = bbox.x2 * scaleX;
        const by2 = bbox.y2 * scaleY;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

        inside =
          bx1 >= zoneX &&
          by1 >= zoneY &&
          bx2 <= zoneX + zoneWidth &&
          by2 <= zoneY + zoneHeight;
      }

      setInsideZone(inside);
      onInsideZoneChange?.(inside);

      ctx.fillStyle = inside ? "lime" : "red";
      ctx.font = "16px Arial";
      ctx.fillText(inside ? "INSIDE ZONE" : "OUTSIDE ZONE", 10, 20);
    };

    if (!img.complete) img.onload = draw;
    else draw();
  }, [cameraData]);

  return (
    <div>
      {/* ✅ Start/Stop Camera Buttons */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={startCamera} style={{ marginRight: "10px" }}>
          Start Camera
        </button>
        <button onClick={stopCamera}>
          Stop Camera
        </button>
      </div>



      {/* Camera View */}
      <div style={{ position: "relative", width: "640px", maxWidth: "100%" }}>
        {cameraData?.image && (
          <img
            ref={imgRef}
            src={`data:image/jpeg;base64,${cameraData.image}`}
            alt="live"
            style={{ width: "100%", display: "block" }}
          />
        )}

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
