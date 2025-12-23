import React from "react";
import { 
    Box,
    Title,
    Flex,
    Button,
    Group,
    Alert,
    Transition,
} from "@mantine/core";

import IRecord from "./interface/IRecord";
import { IRecordChildParent, IRecordChildParentInit } from "./interface/IRecord";
import RecordFill from "./components/recordFill";
import { TbAlertCircle } from "react-icons/tb"
import PatientModeSelector from "./components/patientMode";

interface RegistryProps {
    operatorNumber: string;
}

// Initial state
const recordInit: IRecord = {
    hn: "",
    firstname: "",
    lastname: "",
    age: 0,
    sex: "",
    dob: null,
}

const Registry = ({ operatorNumber }: RegistryProps) => {
    const [patient, setPatient] = React.useState<string>("child")   // patient record fill
    const [record, setRecord] = React.useState<IRecordChildParent>(IRecordChildParentInit)  

    const tbAlertCircle = <TbAlertCircle/>
    const [alertBox, setAlertBox] = React.useState<boolean>(false)  // alert error
    const [alertTitle, setAlertTitile] = React.useState<string>("") // alert tilte
    const [alertMsg, setAlertMsg] = React.useState<string>("")  // alert message
    const [colorAlert, setColorAlert] = React.useState<string>("red")
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click

    React.useEffect(()=>{
        setRecord(IRecordChildParentInit)
    }, [patient])

    // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout((e)=>{
            setAlertMsg("")
            setAlertBox(false)
            clearTimeout(timeout)
        }, 5000)
    }

    const handleReset = () => {
        setRecord(IRecordChildParentInit)
    }

    const handleSubmit = async () => {
        setLoading(true)
        console.log(record)
        
        try {
            const currentRecord:IRecord = (patient === "child" ? {
                hn: record.child_hn,
                firstname: record.child_fname,
                lastname: record.child_lname,
                age: record.child_age,
                sex: record.child_sex,
                dob: record.child_dob,
            } : {
                hn: record.parent_hn,
                firstname: record.parent_fname,
                lastname: record.parent_lname,
                age: record.parent_age,
                sex: record.parent_sex,
                dob: record.parent_dob,
            })
            
            // Check if user filled out the Full Profile
            const isFullProfile = 
                currentRecord.firstname && 
                currentRecord.lastname && 
                currentRecord.sex && 
                currentRecord.dob;

            // 1. Validation
            if (!isFullProfile) {
                throw new Error("Please fill all fields to register");
            }

            const hasRelation:boolean = (patient === "child" ?
                record.parent_hn.trim() !== "" :
                record.child_hn.trim() !== ""
            )
            // ---------------------------------------------------------
            // STEP 1: INSERT
            // ---------------------------------------------------------
            let insertSuccess = false;

            if (isFullProfile) {
                const payload = {
                    hn: currentRecord.hn as string,
                    firstname: currentRecord.firstname as string,
                    lastname: currentRecord.lastname as string,
                    age: Number(currentRecord.age),
                    sex: currentRecord.sex as string,
                    dob: currentRecord.dob!.toISOString().split('T')[0] 
                };

                // Add op_number to the call
                let insertRes;
                if (patient === "child") {
                    insertRes = await window.electronAPI.insertChild(payload, operatorNumber);
                } else {
                    insertRes = await window.electronAPI.insertParent(payload, operatorNumber);
                }

                if (insertRes.success) {
                    insertSuccess = true;
                } else {
                    const errString = insertRes.error?.toLowerCase() || "";
                    
                    // 👇 FIX IS HERE: Only ignore duplicate if we have a relation to link!
                    if ((errString.includes("duplicate") || errString.includes("unique") || errString.includes("exists")) && hasRelation) {
                        console.log("⚠️ HN already exists. Proceeding to Link Check...");
                        insertSuccess = true; 
                    } else if (errString.includes("duplicate") || errString.includes("unique")) {
                        // If NO relation provided, this is a real error!
                        throw new Error(`The HN "${payload.hn}" is already registered.`);
                    } else {
                        throw new Error(insertRes.error || "Registration unsuccessfully.");
                    }
                }
            } else {
                console.log("🔗 Partial Info detected: Skipping Insert, proceeding to Link.");
                // If they didn't try to insert (partial info), we consider "insert" step valid to proceed
                insertSuccess = true;
            }

            // ---------------------------------------------------------
            // STEP 2: LINKING
            // ---------------------------------------------------------
            let linkMessage = "";


            if (insertSuccess && hasRelation) {

                const linkRes = await window.electronAPI.linkParentChild(record.parent_hn, record.child_hn);

                if (linkRes.success) {
                    linkMessage = " & Relation Linked!";
                } else {
                    const linkErr = linkRes.error?.toLowerCase() || "";
                    if (linkErr.includes("duplicate") || linkErr.includes("unique")) {
                        linkMessage = " (Relation already linked)";
                    } else {
                        // If we just registered them, but linking failed, warn the user
                        // But don't throw an error if the registration part was actually new
                        throw new Error(`Patient saved, but linking failed: ${linkRes.error}`);
                    }
                }
            }

            // ---------------------------------------------------------
            // SUCCESS
            // ---------------------------------------------------------
            setAlertBox(true);
            setAlertTitile("Success")
            if (isFullProfile) {
                setAlertMsg(`Registration Successfully${linkMessage}`);
            } else {
                setAlertMsg(`Linked Successfully${linkMessage}`);
            }
            setColorAlert("green")
            
            setRecord(IRecordChildParentInit)

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
                    <PatientModeSelector patient={patient} setPatient={setPatient} />
                    
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
                        <Title order={4}>{patient === "child" ? "Child Info" : "Parent Info"}</Title>

                        <RecordFill 
                            record={record} 
                            setRecord={setRecord}
                            patient={patient}
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