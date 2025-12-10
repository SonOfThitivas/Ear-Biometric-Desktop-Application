import React from "react";
import { 
    Box,
    Stepper,
    Title,
    Button,
    Flex,
    Group,
    Alert,
} from "@mantine/core";

import IResult from "./interface/IResult";
import RecordFill from "./components/recordFill";

const recordInit: IResult = {
    hn: "",
    firstname: "",
    lastname: "",
    age: 0,
    sex: "",
    dob: "",
    // dob: Date | null
}

const Registry = () => {
    const [active, setActive] = React.useState<number>(0)   // stepper
    const [disable, setDisable] = React.useState<boolean>(true)  // next button enable
    const [childRecord, setChildRecord] = React.useState<IResult>(recordInit)   // child record
    const [parentRecord, setParentRecord] = React.useState<IResult>(recordInit) // parent record

    const handleReset = () => {
        
        if (active===0) {
            setChildRecord(recordInit)
            setParentRecord(recordInit)
        }
    }

    React.useEffect(()=>{
        // console.log("child:", childRecord)
        // console.log("parent:", parentRecord)
        // console.log("\n\n")
        if (active === 0){
            if (
                childRecord.hn !== "" &&
                childRecord.firstname !== "" &&
                childRecord.lastname !== "" &&
                // childRecord.age !== 0 &&
                childRecord.sex !== "" &&
                childRecord.dob !== "" &&
                parentRecord.hn !== "" &&
                parentRecord.firstname !== "" &&
                parentRecord.lastname !== "" &&
                // parentRecord.age !== 0 &&
                parentRecord.sex !== "" &&
                parentRecord.dob !== ""
            ) setDisable(false)
            else setDisable(true)
        }
    },[childRecord, parentRecord])

    return (
    <Box component="div">
        {/* registeration step */}
        <Box component="div" p={"md"}>
            <Stepper 
                active={active} 
                iconPosition="right" 
                onStepClick={setActive}
            >
                <Stepper.Step label="Step 1" description="Fill record">
                    <Flex 
                        direction={"column"} 
                        align={"center"} 
                        bd={"2 solid black"} 
                        bdrs={"sm"}
                        p={"sm"}
                    >
                        <Title order={3}>Record</Title>
                        {/* child record */}
                        <Box 
                            component='div' 
                            w={"100%"}
                            p={"sm"} 
                            m={"sm"} 
                            bd={"2px black solid"} 
                            bdrs={"sm"}
                        >
                            <Title order={4}>Child</Title>
                            <RecordFill record={childRecord} setRecord={setChildRecord}/>
                        </Box>
                        {/* parent record */}
                        <Box 
                            component='div' 
                            w={"100%"}
                            p={"sm"} 
                            m={"sm"} 
                            bd={"2px black solid"} 
                            bdrs={"sm"}
                        >
                            <Title order={4}>Parent</Title>
                            <RecordFill record={parentRecord} setRecord={setParentRecord}/>
                        </Box>
                    </Flex>
                    
                </Stepper.Step>

                <Stepper.Step label="Step 2" description="Child's ear capturing" >
                    Child's ear capturing
                </Stepper.Step>

                <Stepper.Step label="Step 3" description="Parent's ear capturing" >
                    Parent's ear capturing
                </Stepper.Step>

                <Stepper.Completed>
                    Completed, click back button to get to previous step
                </Stepper.Completed>
            </Stepper>
        </Box>

        {/* button step controller */}
        <Flex 
            mb={"md"} 
            justify={"center"} 
            bottom={0}
            w={"100%"}
            pos={"fixed"}
        >
            <Group grow>
                <Button 
                    variant="filled" 
                    color="red" 
                    size="md"
                    disabled={active===0}
                    onClick={()=>setActive(active-1)}
                >
                    back
                </Button>

                <Button
                    variant="filled" 
                    color="yellow" 
                    size="md"
                    onClick={handleReset}
                >
                    reset
                </Button>

                <Button 
                    variant="filled" 
                    color="blue" 
                    size="md"
                    disabled={disable || (active === 3)}
                    onClick={()=>setActive(active+1)}
                >
                    Next
                </Button>
            </Group>
        </Flex>
    </Box>
    )
}

export default Registry