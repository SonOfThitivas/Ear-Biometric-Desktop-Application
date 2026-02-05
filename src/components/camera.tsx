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

      // --- DATA EXTRACTION ---
      const bbox = cameraData.bbox;
      const isFlatHoriz = cameraData.horiz_status === true;
      const isFlatVert = cameraData.vert_status === true;
      const isFlat = isFlatHoriz && isFlatVert;
      
      let insideBox = false;

      if (bbox) {
        const scaleX = imgWidth / 640;
        const scaleY = imgHeight / 480;

        const bx1 = bbox.x1 * scaleX;
        const by1 = bbox.y1 * scaleY;
        const bx2 = bbox.x2 * scaleX;
        const by2 = bbox.y2 * scaleY;

        // Draw Bounding Box (Red if not flat, Lime if flat)
        ctx.strokeStyle = isFlat ? "lime" : "red";
        ctx.lineWidth = 3;
        ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

        // Check if bbox is inside zone
        insideBox =
          bx1 >= zoneX &&
          by1 >= zoneY &&
          bx2 <= zoneX + zoneWidth &&
          by2 <= zoneY + zoneHeight;
      }

      // Check Distance
      let validDistance = false;
      if (cameraData?.distance !== undefined) {
        const dist = Number(cameraData.distance);
        // Example range: 0.2m to 0.3m
        validDistance = dist >= 0.20 && dist <= 0.30; 
        
        ctx.fillStyle = validDistance ? "lime" : "red";
        ctx.font = "16px Arial";
        ctx.fillText(`Dist: ${cameraData.distance.toFixed(2)} m`, 10, 40);
      }

      // --- FINAL VALIDATION ---
      const finalInside = insideBox && validDistance && isFlat;
      
      setInsideZone(finalInside);
      onInsideZoneChange?.(finalInside);

      // --- UI FEEDBACK ---
      ctx.font = "bold 20px Arial";
      
      // 1. Overall Status
      ctx.fillStyle = finalInside ? "lime" : "red";
      ctx.fillText(finalInside ? "READY TO SCAN" : "ADJUST POSITION", 10, 20);

      // 2. Angle Feedback (DYNAMIC TEXT)
      if (bbox) {
        let yPos = 80;

        // HORIZONTAL
        if (!isFlatHoriz) {
            ctx.fillStyle = "orange";
            const hMsg = cameraData.horiz_msg || "Adjust Horizontal";
            // Add arrows to text for clarity
            let arrow = "";
            if (hMsg.includes("LEFT")) arrow = "⟵ ";
            if (hMsg.includes("RIGHT")) arrow = "⟶ ";
            
            ctx.fillText(`${arrow}${hMsg} (${cameraData.horiz_diff})`, 10, yPos);
            yPos += 30;
        } else {
            ctx.fillStyle = "lime";
            ctx.fillText("✓ Horizontal: OK", 10, yPos);
            yPos += 30;
        }

        // VERTICAL
        if (!isFlatVert) {
            ctx.fillStyle = "orange";
            const vMsg = cameraData.vert_msg || "Adjust Vertical";
            
            let arrow = "";
            if (vMsg.includes("UP")) arrow = "↑ ";
            if (vMsg.includes("DOWN")) arrow = "↓ ";

            ctx.fillText(`${arrow}${vMsg} (${cameraData.vert_diff})`, 10, yPos);
        } else {
            ctx.fillStyle = "lime";
            ctx.fillText("✓ Vertical: OK", 10, yPos);
        }
      }
    };

    if (!img.complete) img.onload = draw;
    else draw();
  }, [cameraData]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={startCamera} style={{ marginRight: "10px" }}>
          Start Camera
        </button>
        <button onClick={stopCamera}>
          Stop Camera
        </button>
      </div>

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