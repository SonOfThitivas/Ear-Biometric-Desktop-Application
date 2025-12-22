import React from 'react'
import { 
    Flex, 
    Group,
    Box, 
    Button,
    Text,
    Title,
    SegmentedControl,
    Center,
    Switch,
    Alert,
    Transition
} from '@mantine/core'

import TableResult from './components/tableResult'
import {IRecordChildParent} from "./interface/IRecord"
import { TbAlertCircle } from "react-icons/tb"
import Camera from "./components/camera"
import useCameraSocket from "./hooks/useCameraSocket"
import PatientModeSelector from './components/patientMode'

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

export default function Identify() {
    const [patient, setPatient] = React.useState<string>("child")
    const [childParentRecord, setChildParentRecord] = React.useState<IRecordChildParent>(recordInit)

    const { capture, captureResult } = useCameraSocket()

    const [insideZone, setInsideZone] = React.useState(false)
    const [countdown, setCountdown] = React.useState(0)
    const [isCapturing, setIsCapturing] = React.useState(false)
    const [vector, setVector] = React.useState<number[] | null>(null)
    const [hasCaptured, setHasCaptured] = React.useState(false);

    const tbAlertCircle = <TbAlertCircle/>
    const [alertBox, setAlertBox] = React.useState<boolean>(false)
    const [alertTitle, setAlertTitile] = React.useState<string>("")
    const [alertMsg, setAlertMsg] = React.useState<string>("")
    const [colorAlert, setColorAlert] = React.useState<string>("red")
    const [loading, setLoading] = React.useState<boolean>(false)

    // ✅ Auto-hide alert
    const handleTransition = () => {
        const timeout = setTimeout(() => {
            setAlertMsg("")
            setAlertBox(false)
            clearTimeout(timeout)
        }, 5000)
    }

    const handleReset = () => {
        setInsideZone(false)
        setIsCapturing(false)
        setLoading(false)
        setCountdown(0)
        setChildParentRecord(recordInit)
        setVector(null)
    }

    // ✅ Start auto-capture workflow
    const handleDetect = () => {
        if (isCapturing) return
        setCountdown(4)
        setIsCapturing(true)
        setVector(null)
        setHasCaptured(false);
        setLoading(true)
    }

    // ✅ Reset countdown when ear leaves zone
    React.useEffect(() => {
        if (!isCapturing) return
        if (!insideZone) setCountdown(4)
    }, [insideZone, isCapturing])

    // ✅ Drive countdown
    React.useEffect(() => {
        if (!isCapturing) return
        if (!insideZone) return
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
        
        setHasCaptured(true);
        capture("IDENTIFY", patient)
    }, [countdown, isCapturing, insideZone, capture, patient])

    // ✅ When Python returns embedding → run your DB logic
    React.useEffect(() => {
        if (!captureResult) return

        setIsCapturing(false)
        setVector(captureResult.embedding)

        runIdentification(captureResult.embedding)
    }, [captureResult])

    React.useEffect(()=>console.log("Patient:", patient),[patient])

    // ✅ Your existing DB lookup logic, unchanged
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
            res = await window.electronAPI.findClosestChild(vector);
        } else {
            console.log("➡️ [Identify] Calling findClosestParent()");
            res = await window.electronAPI.findClosestParent(vector);
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
            setAlertBox(true);
            setAlertTitile("Success");
            setAlertMsg("Detection Successfully");
            setColorAlert("green");
        } else {
            console.error("❌ [Identify] No record found for HN:", hn);
            throw new Error("Detection unsuccessfully, something went wrong. Please, try again.");
        }

    } catch (err) {
        console.error("❌ [Identify] Identification error:", err);

        setAlertBox(true);
        setAlertTitile("Error");
        setAlertMsg(err.message);
        setColorAlert("red");
    }

    console.log("✅ [Identify] Identification process finished.");
    setLoading(false);
};


    return (
        <Flex gap="sm" justify="center" direction="row" p="xs" w={"100%"}>
            {/* Left Section */}
            <Box w={"30%"} maw={"30%"}>
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
                    <Title order={4}>Inside Zone - {insideZone ? "✅ Yes" : "❌ No"}</Title>
                    <Title order={4}>Countdown - {countdown}</Title>
                    <Title order={4}>Status - {isCapturing ? "Capturing..." : "Idle"}</Title>
                </Box>

                <Flex w={"100%"} direction={"column"} align={"center"} p={"sm"}>
                    <Text size='xl' fw={500}>Result</Text>

                    {/* Child */}
                    <Box component='div' w={"100%"} mt="sm">
                        <Text size='sm' fw={500}>Child</Text>
                        <TableResult
                    hn={childParentRecord.child_hn}
                    firstname={childParentRecord.child_fname}
                    lastname={childParentRecord.child_lname}
                    age={childParentRecord.child_age}
                    sex={childParentRecord.child_sex}
                    dob={
                        childParentRecord.child_dob
                        ? new Date(childParentRecord.child_dob).toLocaleDateString()
                        : "-"
                    }
                    />
                    </Box>

                    {/* Parent */}
                    <Box component='div' w={"100%"} mt="sm">
                        <Text size='sm' fw={500}>Parent</Text>
                        <TableResult
                    hn={childParentRecord.parent_hn}
                    firstname={childParentRecord.parent_fname}
                    lastname={childParentRecord.parent_lname}
                    age={childParentRecord.parent_age}
                    sex={childParentRecord.parent_sex}
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
            <Box component='div' w={"70%"} maw={"70%"} p={"sm"}>
                <Text size='md' fw={500}>Camera</Text>
                <Camera onInsideZoneChange={setInsideZone} />
            </Box>

            {/* Alerts */}
            <Transition
                mounted={alertBox}
                transition="fade-left"
                duration={400}
                timingFunction="ease"
                keepMounted
                onEntered={handleTransition}
            >
                {(styles) => 
                <Alert
                    pos={"fixed"}
                    w={"25%"}
                    right={"1rem"}
                    bottom={"1rem"}
                    variant="filled" 
                    color={colorAlert} 
                    title={alertTitle}
                    icon={tbAlertCircle}
                    onClose={()=>setAlertBox(false)}
                    withCloseButton
                    style={styles}
                >
                    {alertMsg}
                </Alert>}
            </Transition>
        </Flex>
    )
}
