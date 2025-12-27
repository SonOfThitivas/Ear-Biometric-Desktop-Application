import React from "react";
import {
  Flex,
  Group,
  Box,
  Button,
  Text,
  TextInput,
  Alert,
  Transition,
  Title,
} from "@mantine/core";
import { TbAlertCircle } from "react-icons/tb";

import Camera from "./components/camera";
import useCameraSocket from "./hooks/useCameraSocket";
import PatientModeSelector from "./components/patientMode";

interface UpdatePageProps {
  operatorNumber: string;
}

export default function UpdatePage({ operatorNumber }: UpdatePageProps) {
  const [hn, setHn] = React.useState("");
  const [patient, setPatient] = React.useState<"child" | "parent">("child");

  const { capture, captureResult } = useCameraSocket();

  const [insideZone, setInsideZone] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [captures, setCaptures] = React.useState<any[]>([]);
  const [isCapturing, setIsCapturing] = React.useState(false);

  // Alert state
  const [alertBox, setAlertBox] = React.useState(false);
  const [alertTitle, setAlertTitle] = React.useState("");
  const [alertMsg, setAlertMsg] = React.useState("");
  const [colorAlert, setColorAlert] = React.useState("red");
  const tbAlertCircle = <TbAlertCircle />;
  const [loading, setLoading] = React.useState<boolean>(false)

  const handleTransition = () => {
    const timeout = setTimeout(() => {
      setAlertBox(false);
      setAlertMsg("");
      clearTimeout(timeout);
    }, 4000);
  };

    const handleReset = () => {
        setInsideZone(false)
        setIsCapturing(false)
        setLoading(false)
        setCountdown(0)
        setHn("")
    }

  // Start workflow
  const handleCapture = () => {
    if (isCapturing) return;
    setCaptures([]);
    setCountdown(3);
    setIsCapturing(true);
    setLoading(true)
  };

  // Reset countdown when ear leaves zone
  React.useEffect(() => {
    if (!isCapturing) return;
    if (!insideZone) setCountdown(3);
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
    if (countdown === 0) window.electronAPI.beep()
    setLoading(false)
    capture(hn, patient);
    setCountdown(3);
  }, [countdown, isCapturing, insideZone, capture, hn, patient]);

  // Store each capture result
  React.useEffect(() => {
    if (!captureResult) return;

    setCaptures((prev) => {
      const updated = [...prev, captureResult];

      if (updated.length === 3) {
        setIsCapturing(false);
        console.log("All 3 captures complete:", updated);
        sendToDatabase(updated, hn, patient);
      }

      return updated;
    });
  }, [captureResult]);

  // Send to database
  const sendToDatabase = async (
    captures: any[],
    hn: string,
    patientMode: "child" | "parent"
  ) => {
    if (!hn.trim()) {
      setAlertBox(true);
      setAlertTitle("Error");
      setAlertMsg("Missing HN");
      setColorAlert("red");
      return;
    }

    const v1 = captures[0]?.embedding;
    const v2 = captures[1]?.embedding;
    const v3 = captures[2]?.embedding;
    const folderPath = captures[0]?.folder || "";

    try {
      let result;
      if (patientMode === "child") {
        result = await window.electronAPI.insertChildVectors(
          hn,
          v1,
          v2,
          v3,
          folderPath,
          operatorNumber
        );
      } else {
        result = await window.electronAPI.insertParentVectors(
          hn,
          v1,
          v2,
          v3,
          folderPath,
          operatorNumber
        );
      }

      if (result.success) {
        setAlertBox(true);
        setAlertTitle("Success");
        setAlertMsg(`Successfully saved 3 vectors for ${hn}!`);
        setColorAlert("green");
        setHn("");
        setCaptures([]);
      } else {
        setAlertBox(true);
        setAlertTitle("Error");
        setAlertMsg("Failed to save: " + result.error);
        setColorAlert("red");
      }
    } catch (err: any) {
      setAlertBox(true);
      setAlertTitle("System Error");
      setAlertMsg(err.message);
      setColorAlert("red");
    }
  };

  return (
    <Flex gap="sm" justify="center" direction="row" p="xs" w={"100%"}>
      {/* Left Section */}
      <Box w={"30%"} maw={"30%"}>
        <PatientModeSelector patient={patient} setPatient={setPatient} />

        <TextInput
          label="HN"
          placeholder="Enter HN"
          value={hn}
          onChange={(e) => setHn(e.currentTarget.value)}
          mt="md"
        />

        <Group grow justify={"space-between"} m={"sm"}>
            <Button variant="filled" color="blue" onClick={handleCapture} loading={loading}>
                Start 3‑Capture
            </Button>
            <Button variant='filled' color='yellow' onClick={handleReset}>
                Reset
            </Button>
        </Group>

        <Box mt="md">
          <Title order={4}>
            Inside Zone - {insideZone ? "✅ Yes" : "❌ No"}
          </Title>
          <Title order={4}>Countdown - {countdown}</Title>
          <Title order={4}>Captures - {captures.length} / 3</Title>
          <Title order={4}>
            Status - {isCapturing ? "Capturing..." : "Idle"}
          </Title>
        </Box>
      </Box>

      {/* Camera Section */}
      <Box component='div' w={"70%"} maw={"70%"} p={"sm"}>
          <Text size='md' fw={500}>Camera</Text>
          <Camera onInsideZoneChange={setInsideZone} />
      </Box>

      {/* Mantine Alert */}
      <Transition
        mounted={alertBox}
        transition="fade-left"
        duration={400}
        timingFunction="ease"
        keepMounted
        onEntered={handleTransition}
      >
        {(styles) => (
          <Alert
            pos={"fixed"}
            w={"25%"}
            right={"1rem"}
            bottom={"1rem"}
            variant="filled"
            color={colorAlert}
            title={alertTitle}
            icon={tbAlertCircle}
            withCloseButton
            onClose={() => setAlertBox(false)}
            style={styles}
          >
            {alertMsg}
          </Alert>
        )}
      </Transition>
    </Flex>
  );
}
