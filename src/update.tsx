import React from "react";
import {
  Flex,
  Group,
  Box,
  Button,
  Text,
  Switch,
  TextInput,
} from "@mantine/core";

import Camera from "./components/camera";
import useCameraSocket from "./hooks/useCameraSocket";

export default function UpdatePage() {
    const [hn, setHn] = React.useState("");
    const [mode, setMode] = React.useState(true);

    const { capture, captureResult, cameraData } = useCameraSocket();

    const [insideZone, setInsideZone] = React.useState(false);
    const [countdown, setCountdown] = React.useState(0);
    const [captures, setCaptures] = React.useState<any[]>([]); // Added type for safety
    const [isCapturing, setIsCapturing] = React.useState(false);

    // Start workflow
    const handleCapture = () => {
        if (isCapturing) return;
        setCaptures([]);
        setCountdown(4);
        setIsCapturing(true);
    };

    // Reset countdown when ear leaves zone
    React.useEffect(() => {
    if (!isCapturing) return;

    if (!insideZone) {
        setCountdown(4);
    }
    }, [insideZone, isCapturing]);

    // Drive countdown every second
    React.useEffect(() => {
    if (!isCapturing) return;
    if (!insideZone) return;
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
    }, [countdown, insideZone, isCapturing]);

    // When countdown hits 0 → capture
    React.useEffect(() => {
    if (!isCapturing) return;
    if (countdown !== 0) return;
    if (!insideZone) return;

    capture(hn, mode ? "child" : "parent");
    setCountdown(4);
    }, [countdown, isCapturing, insideZone, capture, hn, mode]);

    // Store each capture result
    React.useEffect(() => {
    if (!captureResult) return;

    setCaptures((prev) => {
        const updated = [...prev, captureResult];

        if (updated.length === 3) {
            setIsCapturing(false);
            console.log("All 3 captures complete:", updated);
            // FIX: Pass 'mode' (boolean) directly
            sendToDatabase(updated, hn, mode);
        }

        return updated;
    });
    }, [captureResult]);

    // REPLACED PLACEHOLDER WITH REAL DB LOGIC
    const sendToDatabase = async (captures: any[], hn: string, isChildMode: boolean) => {
        // 1. Validation
        if (!hn.trim()) {
            console.error("❌ Missing HN");
            return;
        }

        // 2. Prepare Data
        const v1 = captures[0]?.embedding;
        const v2 = captures[1]?.embedding;
        const v3 = captures[2]?.embedding;
        const folderPath = captures[0]?.folder || "";

        console.log(`🚀 Sending vectors to DB for HN: ${hn} (${isChildMode ? "Child" : "Parent"})`);

        try {
            let result;

            // 3. Call Electron API based on mode
            if (isChildMode) {
                result = await window.electronAPI.insertChildVectors(hn, v1, v2, v3, folderPath);
            } else {
                result = await window.electronAPI.insertParentVectors(hn, v1, v2, v3, folderPath);
            }

            // 4. Handle Result
            if (result.success) {
                console.log("✅ Database Insert Success!");
                alert(`Successfully saved 3 vectors for ${hn}!`);
                setHn(""); 
                setCaptures([]);
            } else {
                console.error("❌ Database Insert Failed:", result.error);
                alert("Failed to save to database: " + result.error);
            }

        } catch (err: any) {
            console.error("❌ System Error:", err);
            alert("System Error: " + err.message);
        }
    };


  return (
    <Flex gap="sm" justify="center" direction="row" p="xs" w={"100%"}>
      {/* Left Section */}
      <Box w={"30%"} maw={"30%"}>
        <Switch
          defaultChecked
          labelPosition="left"
          label="Patient Mode"
          size="xl"
          radius="xs"
          onLabel="Child"
          offLabel="Parent"
          p="sm"
          checked={mode}
          onChange={(e) => setMode(e.currentTarget.checked)}
        />

        <TextInput
          label="HN"
          placeholder="Enter HN"
          value={hn}
          onChange={(e) => setHn(e.currentTarget.value)}
          mt="md"
        />

        <Group grow justify={"space-between"} m={"sm"}>
          <Button variant="filled" color="blue" onClick={handleCapture}>
            Start 3‑Capture
          </Button>
        </Group>

        <Box mt="md">
          <Text fw={500}>Inside Zone: {insideZone ? "✅ Yes" : "❌ No"}</Text>
          <Text fw={500}>Countdown: {countdown}</Text>
          <Text fw={500}>Captures: {captures.length} / 3</Text>
        </Box>

        {captures.length === 3 && (
          <Box mt="md">
            <Text fw={700}>✅ All 3 captures complete</Text>
          </Box>
        )}
      </Box>

      {/* Right Section */}
      <Box
        component="div"
        bd={"2px black solid"}
        bdrs={"sm"}
        w={"70%"}
        maw={"70%"}
        p={"sm"}
      >
        <Text size="md" fw={500}>
          Camera
        </Text>
        <Camera onInsideZoneChange={setInsideZone} />
      </Box>
    </Flex>
  );
}