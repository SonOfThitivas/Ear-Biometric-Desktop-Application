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
} from "@mantine/core";

import IRecord from "./interface/IRecord";
import RecordFill from "./components/recordFill";
import { TbAlertCircle } from "react-icons/tb"

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

    const tbAlertCircle = <TbAlertCircle/>
    const [alertBox, setAlertBox] = React.useState<boolean>(false)  // alert error
    const [alertTitle, setAlertTitile] = React.useState<string>("") // alert tilte
    const [alertMsg, setAlertMsg] = React.useState<string>("")  // alert message
    const [colorAlert, setColorAlert] = React.useState<string>("red")
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click

    React.useEffect(()=>{
        console.log(patient)
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
    }

    const handlePatientSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.value === "parent") setPatient("child")
        else setPatient("parent")
    }

    const handleSubmit = async () => {
        setLoading(true)
        
        try {
            if ((
                (patient === "child") &&
                (childRecord.hn === "" ||
                childRecord.firstname === "" ||
                childRecord.lastname === "" ||
                childRecord.sex === "" ||
                childRecord.dob === null)) ||
                ((patient === "parent") && 
                (parentRecord.hn === "" ||
                parentRecord.firstname === "" ||
                parentRecord.lastname === "" ||
                parentRecord.sex === "" ||
                parentRecord.dob === null))
            ) {
                // all the records that were on each mode, were not filled
                throw new Error("All the records were not filled.")
            } else if (patient !== "child" && patient !== "parent") {
                // schematic error
                throw new Error("Something went wrong. Please, try again.")
            }

            if (patient === "child") {
                // insert child
                const res = await window.electronAPI.insertChild(childRecord);
            }
            else {
                // insert parent
                const res = await window.electronAPI.insertParent(parentRecord);
            }

            const res = {success:1}

            if (res.success){
                // success
                setAlertBox(true);
                setAlertTitile("Success")
                setAlertMsg("Registration Successfully");
                setColorAlert("green")
                // reset the record fills.
                if (patient === "child") setChildRecord(recordInit)
                else setParentRecord(recordInit)
            } else {
                throw new Error("Registration unsuccessfully, something went wrong. Please, try again.")
            }

        } catch (err){
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
                    {/* record fill*/}
                    <Box 
                        component='div' 
                        maw={"75%"}
                        p={"sm"} 
                        m={"sm"} 
                        bd={"2px black solid"} 
                        bdrs={"sm"}
                    >
                        <Title order={4}>{patient === "child" ? "Child" : "Parent"}</Title>
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