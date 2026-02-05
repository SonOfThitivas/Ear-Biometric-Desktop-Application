import React, { useEffect, useRef, useState } from "react";
import useCameraSocket from "../hooks/useCameraSocket";

export default function Camera({ onInsideZoneChange }) {
  const {
    cameraData,
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

      // --- 1. DRAW TARGET ZONE (Static Yellow Box) ---
      const zoneWidth = imgWidth * 0.25;
      const zoneHeight = imgHeight * 0.5;
      const zoneX = (imgWidth - zoneWidth) / 2;
      const zoneY = (imgHeight - zoneHeight) / 2;

      ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"; // Transparent Yellow
      ctx.lineWidth = 2;
      ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight);

      // --- DATA EXTRACTION ---
      const bbox = cameraData.bbox;
      const isFlatHoriz = cameraData.horiz_status === true;
      const isFlatVert = cameraData.vert_status === true;
      const isFlat = isFlatHoriz && isFlatVert;
      
      const distVal = Number(cameraData.distance);
      const validDistance = (distVal >= 0.20 && distVal <= 0.30) || distVal === 0.0;

      let insideBox = false;

      // --- 2. DRAW FACE BOX (Dynamic) ---
      if (bbox) {
        const scaleX = imgWidth / 640;
        const scaleY = imgHeight / 480;

        const bx1 = bbox.x1 * scaleX;
        const by1 = bbox.y1 * scaleY;
        const bx2 = bbox.x2 * scaleX;
        const by2 = bbox.y2 * scaleY;

        const boxColor = (isFlat && validDistance) ? "#00FF00" : "#FF0000";

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

        insideBox =
          bx1 >= zoneX &&
          by1 >= zoneY &&
          bx2 <= zoneX + zoneWidth &&
          by2 <= zoneY + zoneHeight;
      }

      // --- 3. FINAL STATUS CHECK ---
      const finalInside = insideBox && validDistance && isFlat;
      setInsideZone(finalInside);
      onInsideZoneChange?.(finalInside);

      // --- 4. DRAW STATS PANEL (Fixed Top-Left) ---
      // Background Removed

      let textY = 30;
      const xPos = 10;

      // A. MAIN STATUS (Reduced to 16px)
      ctx.font = "bold 16px Arial";
      ctx.fillStyle = finalInside ? "#00FF00" : "#FF0000";
      ctx.fillText(finalInside ? "READY TO SCAN" : "ADJUST POSITION", xPos, textY);
      textY += 25;

      // B. DISTANCE (Reduced to 14px)
      ctx.font = "14px Arial";
      ctx.fillStyle = validDistance ? "#00FF00" : "#FF0000";
      ctx.fillText(`Distance: ${distVal.toFixed(3)} m`, xPos, textY);
      ctx.fillText(validDistance ? " [ OK ]" : " [ TOO FAR/CLOSE ]", xPos + 110, textY);
      textY += 25;

      // C. HORIZONTAL (Reduced to 14px)
      ctx.fillStyle = isFlatHoriz ? "#00FF00" : "#FF0000";
      const hVal = cameraData.horiz_diff ? cameraData.horiz_diff.toFixed(3) : "0.000";
      ctx.fillText(`Horizontal: ${hVal}`, xPos, textY);
      ctx.fillText(isFlatHoriz ? " [ OK ]" : " [ NOT OK ]", xPos + 120, textY);
      
      if (!isFlatHoriz && cameraData.horiz_msg) {
        textY += 20;
        ctx.fillStyle = "#FFA500"; 
        ctx.fillText(`Action: ${cameraData.horiz_msg}`, xPos + 20, textY);
      }
      textY += 25;

      // D. VERTICAL (Reduced to 14px)
      ctx.fillStyle = isFlatVert ? "#00FF00" : "#FF0000";
      const vVal = cameraData.vert_diff ? cameraData.vert_diff.toFixed(3) : "0.000";
      ctx.fillText(`Vertical:    ${vVal}`, xPos, textY);
      ctx.fillText(isFlatVert ? " [ OK ]" : " [ NOT OK ]", xPos + 120, textY);

      if (!isFlatVert && cameraData.vert_msg) {
        textY += 20;
        ctx.fillStyle = "#FFA500"; 
        ctx.fillText(`Action: ${cameraData.vert_msg}`, xPos + 20, textY);
      }
    };

    if (!img.complete) img.onload = draw;
    else draw();
  }, [cameraData]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={startCamera} style={{ marginRight: "10px", padding: "8px 16px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px" }}>
          Start Camera
        </button>
        <button onClick={stopCamera} style={{ padding: "8px 16px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "4px" }}>
          Stop Camera
        </button>
      </div>

      <div style={{ position: "relative", width: "640px", maxWidth: "100%", border: "2px solid #333" }}>
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