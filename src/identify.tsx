import React from 'react'
import { 
    Flex, 
    Group,
    Box, 
    Button,
    Text,
    Title,
    Stack,
} from '@mantine/core'

import TableResult from './components/tableResult'
import CameraStatusTable from './components/cameraStatusTable' // ✅ Import the new component
import {IRecordChildParent} from "./interface/IRecord"
import Camera from "./components/camera"
import useCameraSocket from "./hooks/useCameraSocket"
import PatientModeSelector from './components/patientMode'
import CaptureNoti from './components/captureNoti'
import { notifications } from '@mantine/notifications'

import { useAudioPlayer } from 'react-use-audio-player'
import { 
    handleStartDetection,
    handleDetectionFinish,
} from './components/voicePlayer'
import ScanTime from './components/scanTime'

const recordInit: IRecordChildParent = {
    child_hn: "",
    child_fname: "",
    child_lname: "",
    child_age: null,
    child_sex: "",
    child_dob: null,
    parent_hn: "",
    parent_fname: "",
    parent_lname: "",
    parent_age: null,
    parent_sex: "",
    parent_dob: null
}

interface IdentifyProps {
  operatorNumber: string;
}

export default function Identify({ operatorNumber }: IdentifyProps) {
    const [patient, setPatient] = React.useState<string>("child")
    const [childParentRecord, setChildParentRecord] = React.useState<IRecordChildParent>(recordInit)

    // ✅ Get cameraData for live feedback loops
    const { capture, captureResult, cameraData } = useCameraSocket()

    const [insideZone, setInsideZone] = React.useState(false)
    const [countdown, setCountdown] = React.useState(0)
    const [isCapturing, setIsCapturing] = React.useState(false)
    const [vector, setVector] = React.useState<number[] | null>(null)
    const [hasCaptured, setHasCaptured] = React.useState<boolean>(false);
    const [bgcolor, setBgcolor] = React.useState<string>("white")

    const [loading, setLoading] = React.useState<boolean>(false)
    const { load: voiceLoad } = useAudioPlayer()

    // ✅ Changed from useState to useRef to avoid re-render loops during calculation
    const bgDist = React.useRef<string>("white")
    const bgHori = React.useRef<string>("white")
    const bgVert = React.useRef<string>("white")

    // TIMING
    const [startTime, setStartTime] = React.useState<Date | null>(null)

    const handleReset = () => {
        setInsideZone(false)
        setIsCapturing(false)
        setLoading(false)
        setCountdown(0)
        setChildParentRecord(recordInit)
        setVector(null)
        setBgcolor("white")
        
        // Reset refs
        bgDist.current = "white"
        bgHori.current = "white"
        bgVert.current = "white"

        // TIMING TO NULL
        setStartTime(null)

        notifications.show({
            id: "identify-reset-id",
            title: "Reset!",
            message: "The state has been reset!",
            color:"yellow",
            bg:"yellow.1",
            autoClose: 4000,
            withCloseButton: true,
            withBorder:true,
        })
    }

    // ✅ Start auto-capture workflow
    const handleDetect = () => {
        if (isCapturing) return
        handleStartDetection(voiceLoad)
        setChildParentRecord(recordInit)
        setCountdown(1)
        setIsCapturing(true)
        setVector(null)
        setHasCaptured(false);
        setLoading(true)
    }

    // ✅ Drive countdown
    React.useEffect(() => {
        if (!isCapturing) return
        if (!insideZone) {
            setCountdown(1)
            return
        } 
        if (countdown <= 0) return

        const timer = setTimeout(() => {
            setCountdown((c) => c - 1)
        }, 1000)

        return () => clearTimeout(timer)
    }, [countdown, insideZone, isCapturing])

    // ✅ When countdown hits 0 → capture once
    React.useEffect(() => {
        if (!isCapturing) return
        if (countdown !== 0) return
        if (!insideZone) return
        if (hasCaptured) return
        if (countdown === 0) {
            window.electronAPI.beep()
            // voice end detect
            handleDetectionFinish(voiceLoad)
        }
        
        setHasCaptured(true);
        capture("IDENTIFY", patient)
    }, [countdown, isCapturing, insideZone, capture, patient])

    // ✅ When Python returns embedding → run your DB logic
    React.useEffect(() => {
            if (!captureResult || !captureResult.embedding) return

            setIsCapturing(false)

            try {

                const binaryString = atob(captureResult.embedding);

                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const floatArray = new Float32Array(bytes.buffer);
                const decodedVector = Array.from(floatArray);

                setVector(decodedVector)
                runIdentification(decodedVector) // Send the decoded array to your DB logic
            } catch (error) {
                console.error("❌ Failed to decode base64 embedding:", error)
                notifications.show({
                    title: "Decoding Error",
                    message: "Failed to process the camera data.",
                    color: "red",
                    bg: "red.1"
                })
            }
        }, [captureResult])
    // React.useEffect(()=>console.log("Patient:", patient),[patient])

    // ✅ Your existing DB lookup logic
    const runIdentification = async (vector: number[]) => {
        console.log("🔍 [Identify] Starting identification...");
        console.log("🧬 [Identify] Received vector:", vector);

        let res: { hn?: string; distance?: number } | null = null;

        try {
            if (!vector) {
                console.error("❌ [Identify] No vector received from Python");
                throw new Error("Detection failed. Please, try again.");
            }

            console.log(`👶🧑 [Identify] Patient mode: ${patient}`);
            console.log("📤 [Identify] Sending vector to Electron...");

            // ✅ Call Electron backend
            if (patient === "child") {
                console.log("➡️ [Identify] Calling findClosestChild()");
                res = await window.electronAPI.findClosestChild(vector, operatorNumber);
            } else {
                console.log("➡️ [Identify] Calling findClosestParent()");
                res = await window.electronAPI.findClosestParent(vector, operatorNumber);
            }

            console.log("✅ [Identify] Electron returned:", res);

            if (!res || !res.hn) {
                console.error("❌ [Identify] Electron returned invalid result:", res);
                throw new Error("Matching failed. Please try again.");
            }

            const hn = res.hn;
            console.log("📥 [Identify] Searching DB for HN:", hn);

            // ✅ Query DB
            const data = await window.electronAPI.searchByHN(hn);

            console.log("📄 [Identify] DB returned:", data);

            if (data.length > 0) {
                console.log("✅ [Identify] Match found:", data[0]);

                setChildParentRecord(data[0]);
                notifications.show({
                    title: "Success",
                    color:"green",
                    message: "Detection Successfully",
                    bg:"green.1",
                    withBorder: true,
                    autoClose: 4000,
                    withCloseButton: true,
                })
            } else {
                console.error("❌ [Identify] No record found for HN:", hn);
                throw new Error("Detection unsuccessfully, something went wrong. Please, try again.");
            }

        } catch (err) {
            console.error("❌ [Identify] Identification error:", err);
            notifications.show({
                title: "Error",
                message: err.message,
                color:"red",
                bg:"red.1",
                withBorder: true,
                autoClose: 4000,
                withCloseButton: true,
            })
        }

        console.log("✅ [Identify] Identification process finished.");
        setLoading(false);
    };

    return (
        <Flex 
            gap="sm" 
            justify="start" 
            direction="row" 
            p="xs" 
            w={"100%"}
            bg={bgcolor}
            style={{
                transition: "background-color 0.5s ease"
            }}      
        >
            {/* Left Section */}
            <Box>
                <Box component='div'>
                    <PatientModeSelector patient={patient} setPatient={setPatient}/>

                    <Group grow justify={"space-between"} m={"sm"}>
                        <Button variant='filled' color='blue' onClick={handleDetect} loading={loading}>
                            Detect
                        </Button>
                        <Button variant='filled' color='yellow' onClick={handleReset}>
                            Reset
                        </Button>
                    </Group>
                </Box>

                <Box component='div' mt="md">
                    <Title order={4}>Countdown - {countdown}</Title>
                    <Title order={4}>Status - {isCapturing ? "Capturing..." : "Idle"}</Title>
                </Box>

                <Flex w={"100%"} direction={"column"} align={"center"} p={"sm"}>
                    <Text size='xl' fw={500}>Result</Text>

                    {/* Child */}
                    <Box component='div' w={"100%"}>
                        <Text size='sm' fw={500}>Child</Text>
                        <TableResult
                            hn={childParentRecord.child_hn}
                            firstname={childParentRecord.child_fname}
                            lastname={childParentRecord.child_lname}
                            // age={childParentRecord.child_age}
                            age={childParentRecord.child_age_text}
                            sex={childParentRecord.child_sex}
                            nationality={childParentRecord.child_nationality}
                            dob={
                                childParentRecord.child_dob
                                ? new Date(childParentRecord.child_dob).toLocaleDateString()
                                : "-"
                            }
                        />
                    </Box>

                    {/* Parent */}
                    <Box component='div' w={"100%"}>
                        <Text size='sm' fw={500}>Parent</Text>
                        <TableResult
                            hn={childParentRecord.parent_hn}
                            firstname={childParentRecord.parent_fname}
                            lastname={childParentRecord.parent_lname}
                            // age={childParentRecord.parent_age}
                            age={childParentRecord.parent_age_text}
                            sex={childParentRecord.parent_sex}
                            nationality={childParentRecord.parent_nationality}
                            dob={
                                childParentRecord.parent_dob
                                ? new Date(childParentRecord.parent_dob).toLocaleDateString()
                                : "-"
                            }
                        />
                    </Box>
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
                    <Camera onInsideZoneChange={setInsideZone} patient={patient}/>
                </Box>

                <Stack pl={"xs"} gap={"sm"} align="stretch" justify="flex-start">

                    {/* GUIDELINE  */}
                    <Title order={4} ta={"center"}>Guideline</Title>
                    <CameraStatusTable 
                        isCapturing={isCapturing} 
                        cameraData={cameraData}
                        patientMode={patient} 
                    />

                    {/* TOTAL DETECTION TIME */}
                    <Title order={4} ta={"center"}>Total Detection Time</Title>
                    <ScanTime
                        isCapturing={isCapturing} 
                        startTime={startTime}
                        setStartTime={setStartTime}
                    />
                    

                </Stack>

            </Flex>

            <CaptureNoti 
                isCapture={isCapturing}
                insideZone={insideZone}
                countdown={countdown}
                setBgcolor={setBgcolor}
                load={voiceLoad}
            />

        </Flex>
    )
}