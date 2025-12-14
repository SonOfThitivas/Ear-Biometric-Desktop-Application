import React from 'react'
import { 
    Flex, 
    Group,
    Box, 
    Button,
    Text,
    Switch,
    Alert,
    Transition
} from '@mantine/core'

import TableResult from './components/tableResult'
import {IRecordChildParent} from "./interface/IRecord"
import { TbAlertCircle } from "react-icons/tb"

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

    const tbAlertCircle = <TbAlertCircle/>
    const [alertBox, setAlertBox] = React.useState<boolean>(false)  // alert error
    const [alertTitle, setAlertTitile] = React.useState<string>("") // alert tilte
    const [alertMsg, setAlertMsg] = React.useState<string>("")  // alert message
    const [colorAlert, setColorAlert] = React.useState<string>("red")
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click

     // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout((e)=>{
            setAlertMsg("")
            setAlertBox(false)
            clearTimeout(timeout)
        }, 5000)
    }

    const handlePatientSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.value === "parent") setPatient("child")
        else setPatient("parent")
    }

    const handleReset = () => {
        setChildParentRecord(recordInit)
    }

    // TODO: camera detection and query record from database
    const handleDetect = async () => {
        setLoading(true)

        const vector:number | null = null;
        let res: {hn?:string , distance?:number} | null = null

        try {
            if (vector === null) {
                // detection faild
                throw new Error("Detection failed. Please, try again.")
            } else if (patient !== "child" && patient !== "parent") {
                // schematic error
                throw new Error("Something went wrong. Please, try again.")
            }

            if (patient === "child") {
                // find child hn
                res = await window.electronAPI.findClosestChild(vector)
            }
            else {
                // find parent hn
                res = await window.electronAPI.findClosestParent(vector)
            }

            // get hn
            const hn:string = res.hn

            const data:Array<IRecordChildParent> = await window.electronAPI.searchByHN (hn)

            if (data.length > 0){
                // success
                setChildParentRecord(data[0])
                setAlertBox(true);
                setAlertTitile("Success")
                setAlertMsg("Detection Successfully")
                setColorAlert("green")
            } else {
                throw new Error("Detection unsuccessfully, something went wrong. Please, try again.")
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
        <Flex
            gap="sm"
            justify="center"
            direction="row"
            p="xs"
            w={"100%"}
        >   
            {/* Section Input*/}
            <Box w={"30%"} maw={"30%"}>
                {/* combobox */}
                <Box component='div'>
                    <Switch
                        defaultChecked
                        labelPosition="left"
                        label="Patient Mode"
                        size="xl"
                        radius="xs"
                        onLabel="Child"
                        offLabel="Parent"
                        p="sm"
                        value={patient}
                        onChange={(event)=>handlePatientSwitch(event)}
                    />
                    {/* button */}
                    <Group grow justify={"space-between"} m={"sm"}>
                        <Button variant='filled' color='blue' onClick={handleDetect} loading={loading}>Detect</Button>
                        <Button variant='filled' color='yellow' onClick={handleReset}>Reset</Button>
                    </Group>
                </Box>

                {/* result */}
                <Flex w={"100%"} maw={"100%"} direction={"column"} align={"center"} p={"sm"}>
                    <Text size='xl' fw={500}>Result</Text>
                    <TableResult record={childParentRecord}/>
                </Flex>
            </Box>


            {/* Section Camera */}
            <Box 
                component='div' 
                bd={"2px black solid"} 
                bdrs={"sm"}
                w={"70%"}
                maw={"70%"}
                // h={"100svh"} 
                p={"sm"}
            >
                <Text size='md' fw={500}>Camera</Text>
                
            </Box>

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
        </Flex>
    )
}
