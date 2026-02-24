import React from "react";
import {
  Flex,
  Group,
  Box,
  Button,
  Text,
  TextInput,
  Title,
  Stepper,
  Stack,
} from "@mantine/core";

import Camera from "./components/camera";
import CameraStatusTable from "./components/CameraStatusTable";
import useCameraSocket from "./hooks/useCameraSocket";
import PatientModeSelector from "./components/patientMode";
import CaptureNoti from "./components/captureNoti";
import { notifications } from '@mantine/notifications'
import { useAudioPlayer } from "react-use-audio-player";
import { 
    handleCount, 
    handleCaptureAt, 
    handleStartCapture, 
    handleCaptureFinish,
} from "./components/voicePlayer";

interface UpdatePageProps {
  operatorNumber: string;
}

export default function UpdatePage({ operatorNumber }: UpdatePageProps) {
    const [hn, setHn] = React.useState("");
    const [patient, setPatient] = React.useState<string>("child");

    const { capture, captureResult, cameraData } = useCameraSocket();

    const [insideZone, setInsideZone] = React.useState(false);
    const [countdown, setCountdown] = React.useState(0);
    const [captures, setCaptures] = React.useState<any[]>([]);
    const [isCapturing, setIsCapturing] = React.useState(false);
    const [bgcolor, setBgcolor] = React.useState<string>("white")
    const [step, setStep] = React.useState(0);
    const [resetID, setResetID] = React.useState<string>("reset-id")
    // audio hook
    const { load: voiceLoad} = useAudioPlayer()
    // Alert state
    const [loading, setLoading] = React.useState<boolean>(false)

    const handleReset = () => {
        setInsideZone(false)
        setIsCapturing(false)
        setLoading(false)
        setCountdown(0)
        setHn("")
        setStep(0)

        notifications.show({
            id: resetID,
            title: "Reset!",
            message: "The state has been reset!",
            color:"yellow",
            bg:"yellow.1",
            autoClose: 4000,
            withCloseButton: true,
            withBorder:true,
        })
    }

    // Start workflow
    const handleCapture = () => {
        if (isCapturing) return;
        if (hn === ""){ notifications.show({
            id: "update-captue-id",
            title: "Error!",
            color:"red",
            message: "You have to enter the hospital number.",
            bg:"red.1",
            withBorder: true,
            autoClose: 4000,
            withCloseButton: true,}
        ) 
        return}
        // voice start capture
        handleStartCapture(voiceLoad)
        setStep(step+1)
        setCaptures([]);
        setCountdown(2);
        setIsCapturing(true);
        setLoading(true)
    };

    // Reset countdown when ear leaves zone
    React.useEffect(() => {
        if (!isCapturing) return;
        if (!insideZone) setCountdown(2);
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
    if (countdown === 0) {
        window.electronAPI.beep()
        // voice capture step
        handleCaptureAt(voiceLoad, step + 1)
        setStep(captures.length + 1)
    }
    setLoading(false)
    capture(hn, patient);
    setCountdown(2);
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

    // voice end capture
    handleCaptureFinish(voiceLoad)

  }, [captureResult]);

  // Send to database
  const sendToDatabase = async (
    captures: any[],
    hn: string,
    patientMode: string,
  ) => {
    if (!hn.trim()) {
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
        notifications.show({
            title: "Success",
            message: `Successfully saved 3 vectors for ${hn}!`,
            color:"green",
            bg:"green.1",
            withBorder: true,
            autoClose: 4000,
            withCloseButton: true,
        })

        setHn("");
        setCaptures([]);
      } else {
        notifications.show({
            title: "Success!",
            message: `Successfully saved 3 vectors for ${hn}!`,
            color:"red",
            bg:"red.1",
            withBorder: true,
            autoClose: 4000,
            withCloseButton: true,
        })
      }
    } catch (err: any) {
      notifications.show({
            title: "System Error",
            message: err.message,
            color:"red",
            bg:"red.1",
            withBorder: true,
            autoClose: 4000,
            withCloseButton: true,
        })
  }};

  return (
    <Flex 
        gap="sm" 
        justify="start" 
        direction="row" 
        h={"100svh"}
        p="md" 
        bg={bgcolor}
        style={{
            transition: "background-color 0.5s ease"
        }}  
    >
      {/* Left Section */}
      <Box>
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
          {/* <Title order={4}>
            Inside Zone - {insideZone ? "✅ Yes" : "❌ No"}
          </Title> */}
          <Title order={4}>Countdown - {countdown}</Title>
          <Title order={4}>Captures - {captures.length} / 3</Title>
          <Title order={4}>
            Status - {isCapturing ? "Capturing..." : "Idle"}
          </Title>
        </Box>

        <Flex justify={"center"} mt={"md"}>
            <Stepper active={step} orientation="vertical" color="blue" size="xl">
                <Stepper.Step label="Capture 1" loading={step === 1}/>
                <Stepper.Step label="Capture 2" loading={step === 2}/>
                <Stepper.Step label="Capture 3" loading={step === 3}/>
            </Stepper>
        </Flex>
      </Box>

      {/* Camera Section */}
      <Flex
        justify="start" 
        direction="row"
        wrap={"wrap"}
        >
        <Box component='div' pl={"xs"}>
            <Text size='md' fw={500}>Camera</Text>
            <Camera onInsideZoneChange={setInsideZone} />
        </Box>

        <Stack pl={"xs"} gap={"sm"} align="stretch" justify="flex-start">
            <Title order={4} ta={"center"}>Guideline</Title>
            
            {/* ✅ New Table Component */}
            <CameraStatusTable 
                isCapturing={isCapturing} 
                cameraData={cameraData} 
                patientMode={patient}
            />

        </Stack>
    </Flex>

      {/* Mantine Alert */}
        <CaptureNoti
            isCapture={isCapturing}
            insideZone={insideZone}
            countdown={countdown}
            setBgcolor={setBgcolor}
            load={voiceLoad}
        />
    </Flex>
  );
}
