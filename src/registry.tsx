import React from "react";
import { 
    Box,
    Switch,
    Title,
    Flex,
    Button,
    Group,
    Alert,
    Transition,
    TextInput,
    Text
} from "@mantine/core";

import IRecord from "./interface/IRecord";
import RecordFill from "./components/recordFill";
import { TbAlertCircle } from "react-icons/tb"

// Initial state
const recordInit: IRecord = {
    hn: "",
    firstname: "",
    lastname: "",
    age: 0,
    sex: "",
    dob: null,
}

const Registry = () => {
    const [patient, setPatient] = React.useState<string>("child")   // patient record fill
    const [childRecord, setChildRecord] = React.useState<IRecord>(recordInit)   // child record
    const [parentRecord, setParentRecord] = React.useState<IRecord>(recordInit) // parent record

    // NEW: Relation HN State
    const [relationHN, setRelationHN] = React.useState<string>("");

    const tbAlertCircle = <TbAlertCircle/>
    const [alertBox, setAlertBox] = React.useState<boolean>(false)  // alert error
    const [alertTitle, setAlertTitile] = React.useState<string>("") // alert tilte
    const [alertMsg, setAlertMsg] = React.useState<string>("")  // alert message
    const [colorAlert, setColorAlert] = React.useState<string>("red")
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click

    React.useEffect(()=>{
        console.log("Current Mode:", patient);
        // Clear relation HN when switching modes to avoid confusion
        setRelationHN("");
    },[patient])

    // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout((e)=>{
            setAlertMsg("")
            setAlertBox(false)
            clearTimeout(timeout)
        }, 5000)
    }

    const handleReset = () => {
        setChildRecord(recordInit)
        setParentRecord(recordInit)
        setRelationHN("")
    }

    const handlePatientSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.value === "parent") setPatient("child")
        else setPatient("parent")
    }

    const handleSubmit = async () => {
        setLoading(true)
        
        try {
            const currentRecord = patient === "child" ? childRecord : parentRecord;
            const hn = currentRecord.hn;
            const hasRelation = relationHN.trim() !== "";
            
            // Check if user filled out the Full Profile (Name, Sex, DOB, etc.)
            const isFullProfile = 
                currentRecord.firstname && 
                currentRecord.lastname && 
                currentRecord.sex && 
                currentRecord.dob;

            // ---------------------------------------------------------
            // VALIDATION LOGIC
            // ---------------------------------------------------------

            // 1. HN is always required
            if (!hn) {
                 throw new Error("Hospital Number (HN) is required.");
            }

            // 2. Decide: Is this "Link Only" or "Full Registration"?
            if (!isFullProfile && !hasRelation) {
                // If they didn't fill the profile AND didn't provide a relation to link, it's useless.
                throw new Error("Please fill all fields to register, OR provide a Relation HN to link.");
            }

            // ---------------------------------------------------------
            // STEP 1: INSERT (Only if Full Profile is provided)
            // ---------------------------------------------------------
            if (isFullProfile) {
                // Prepare Payload
                const payload = {
                    hn: currentRecord.hn as string,
                    firstname: currentRecord.firstname as string,
                    lastname: currentRecord.lastname as string,
                    age: Number(currentRecord.age),
                    sex: currentRecord.sex as string,
                    dob: currentRecord.dob!.toISOString().split('T')[0] 
                };

                // Insert to Database
                let insertRes;
                if (patient === "child") {
                    insertRes = await window.electronAPI.insertChild(payload);
                } else {
                    insertRes = await window.electronAPI.insertParent(payload);
                }

                if (!insertRes.success) {
                    // Ignore "Duplicate" errors (it just means the person is already registered)
                    const errString = insertRes.error?.toLowerCase() || "";
                    if (!errString.includes("duplicate") && !errString.includes("unique") && !errString.includes("exists")) {
                        throw new Error(insertRes.error || "Registration unsuccessfully.");
                    }
                }
            } else {
                console.log("🔗 Partial Info detected: Skipping Insert, proceeding to Link.");
            }

            // ---------------------------------------------------------
            // STEP 2: LINKING (Only if Relation HN is provided)
            // ---------------------------------------------------------
            let linkMessage = "";
            
            if (hasRelation) {
                const p_hn = patient === "child" ? relationHN : hn as string;
                const c_hn = patient === "child" ? hn as string : relationHN;

                const linkRes = await window.electronAPI.linkParentChild(p_hn, c_hn);

                if (linkRes.success) {
                    linkMessage = " & Relation Linked!";
                } else {
                    // Check if Link already exists
                    const linkErr = linkRes.error?.toLowerCase() || "";
                    if (linkErr.includes("duplicate") || linkErr.includes("unique")) {
                        linkMessage = " (Relation already linked)";
                    } else {
                        throw new Error(`Linking failed: ${linkRes.error}`);
                    }
                }
            }

            // ---------------------------------------------------------
            // SUCCESS
            // ---------------------------------------------------------
            setAlertBox(true);
            setAlertTitile("Success")
            // Custom message based on what we actually did
            if (isFullProfile) {
                setAlertMsg(`Registration Successfully${linkMessage}`);
            } else {
                setAlertMsg(`Linked Successfully${linkMessage}`);
            }
            setColorAlert("green")
            
            // Reset forms
            if (patient === "child") setChildRecord(recordInit)
            else setParentRecord(recordInit)
            setRelationHN("")

        } catch (err: any){
            setAlertBox(true);
            setAlertTitile("Error")
            setAlertMsg(err.message);
            setColorAlert("red")
        }
       
        setLoading(false)
    }

    return (
        <Box component="div">
            <Box component="div" p={"md"}>
                <Flex 
                    direction={"column"} 
                    align={"center"} 
                    p={"sm"}
                >
                    <Title order={3}>Record</Title>
                    <Switch
                        defaultChecked
                        labelPosition="left"
                        label="Patient"
                        size="xl"
                        radius="xs"
                        onLabel="Child"
                        offLabel="Parent"
                        p="sm"
                        value={patient}
                        onChange={(event)=>handlePatientSwitch(event)}
                    />
                    
                    {/* Record Fill Container */}
                    <Box 
                        component='div' 
                        maw={"75%"}
                        p={"sm"} 
                        m={"sm"} 
                        bd={"2px black solid"} 
                        bdrs={"sm"}
                    >
                        {/* Header with Relation Input */}
                        <Group justify="space-between" mb="md" align="flex-end">
                            <Title order={4}>{patient === "child" ? "Child Info" : "Parent Info"}</Title>
                            
                            {/* NEW: Relation Box */}
                            <Flex align="center" gap="xs">
                                <Text size="sm" fw={500}>
                                    Link with {patient === "child" ? "Parent" : "Child"} HN:
                                </Text>
                                <TextInput 
                                    placeholder={patient === "child" ? "Enter Parent HN" : "Enter Child HN"}
                                    value={relationHN}
                                    onChange={(e) => setRelationHN(e.currentTarget.value)}
                                    size="xs"
                                    w={150}
                                />
                            </Flex>
                        </Group>

                        <RecordFill 
                            record={patient === "child" ? childRecord : parentRecord} 
                            setRecord={patient === "child" ? setChildRecord : setParentRecord}
                        />
                    </Box>
                </Flex>
            </Box>

            {/* button step controller */}
            <Group
                pos={"fixed"}
                justify={"center"} 
                bottom={0}
                w={"100%"}
                pb={"md"}
            >
                <Button
                    variant="filled" 
                    color="yellow" 
                    size="md"
                    onClick={handleReset}
                >
                    Reset
                </Button>
                <Button 
                    variant="filled" 
                    color="green" 
                    size="md"
                    loading={loading}
                    onClick={handleSubmit}   
                >
                    Submit
                </Button>
            </Group>
            {/* alert when error */}
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
        </Box>
    )
}

export default Registry