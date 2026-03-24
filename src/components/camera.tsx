import React, { useEffect, useRef, useState } from "react";
import useCameraSocket from "../hooks/useCameraSocket";
import { Skeleton, Button, Group } from "@mantine/core";
// interface distance range
import { 
    IDistanceRange,
    childDistanceRange,
    parentDistanceRange,
} from "../interface/IDistanceRange";

export default function Camera(
    { 
        onInsideZoneChange,
        patient,
    }:{
        onInsideZoneChange: React.Dispatch<React.SetStateAction<boolean>>,
        patient: string,
}) {
  const {
    cameraData,
    cameraStatus,
    startCamera,
    stopCamera,
  } = useCameraSocket();

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [insideZone, setInsideZone] = useState(false);
  // min/max distance
  const [distRange, setDistRange] = useState<IDistanceRange>(patient === "child" ? childDistanceRange : parentDistanceRange)
  // preloading
  const [loading, setLoading] = useState<boolean>(true)

  // switch range
  useEffect(()=>{
    if (patient === "child") setDistRange(childDistanceRange)
    else setDistRange(parentDistanceRange)
  }, [patient])

  // camera status change
  useEffect(()=>{
    // console.log(cameraStatus)
    if (cameraStatus.running) {
        setLoading(false)
    } else {
        setLoading(true)
    }
  },[cameraStatus])

  useEffect(() => {
    if (!cameraData?.image) return
        
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
      const zoneWidth = imgWidth * 0.275;
      const zoneHeight = imgHeight * 0.5;
      const zoneX = (imgWidth - zoneWidth) / 2;
      const zoneY = (imgHeight - zoneHeight) / 2;

      ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"; // Transparent Yellow
      ctx.lineWidth = 2;
      ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight);

      // --- DATA EXTRACTION (Still needed for box coloring) ---
      const bbox = cameraData.bbox;
      const isFlatHoriz = cameraData.horiz_status === true;
      const isFlatVert = cameraData.vert_status === true;
      const isFlat = isFlatHoriz && isFlatVert;

      const distVal = Number(cameraData.distance);
      const validDistance = (distVal >= distRange.min && distVal <= distRange.max) || distVal === 0.0;

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

      // --- 4. DRAW STATS PANEL ---
      // (Section Removed)
    };

    if (!img.complete) img.onload = draw;
    else draw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraData]);

  return (
    <div>
      <Group mb="10px">
        <Button
          onClick={startCamera}
          color="green"
          radius="sm"
          >
            Start Camera
        </Button>
        <Button
          onClick={stopCamera}
          color="red"
          radius="sm"
          >
            Stop Camera
        </Button>
      </Group>
    
      <div style={{ position: "relative", width: "640px", height:"480px", maxWidth: "100%", border: "2px solid #333" }}>
        <Skeleton visible={loading} pos={"relative"} w={"100%"} h={"100%"}>
            {cameraData?.image && (
            <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${cameraData.image}`}
                alt="live"
                style={{ width: "100%", height: "100%", display: "block" }}
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

        </Skeleton>
      </div>
    </div>
  );
}