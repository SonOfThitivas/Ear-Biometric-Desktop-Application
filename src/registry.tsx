import React from "react";
import { 
    Box,
    Title,
    Flex,
    Button,
    Group,
    Alert,
    Transition,
    MantineProvider
} from "@mantine/core";

import IRecord from "./interface/IRecord";
import { IRecordChildParent, IRecordChildParentInit } from "./interface/IRecord";
import RecordFill from "./components/recordFill";
import { TbAlertCircle } from "react-icons/tb"
import { MdChildCare } from "react-icons/md";
import { IoIosPerson } from "react-icons/io";
import PatientModeSelector from "./components/patientMode";
import { useForm } from "@mantine/form"

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

    const form = useForm({
        mode: 'uncontrolled',
        name: "registry-form",
        initialValues: IRecordChildParentInit,
        transformValues: (values:IRecordChildParent) => ({
            ...values,
            child_dob: values.child_dob ? new Date(values.child_dob) : null,
            parent_dob: values.parent_dob ? new Date(values.parent_dob) : null,
        }),
        validate: (values) => {
            const errors: Record<string, string> = {};
            
            // Helper functions to check if fields are filled
            const isChildHnFilled = values.child_hn && values.child_hn.length > 0;
            const isParentHnFilled = values.parent_hn && values.parent_hn.length > 0;
            
            const areAllChildInputsFilled = 
                values.child_hn && values.child_hn.length > 0 &&
                values.child_fname && values.child_fname.length > 0 &&
                values.child_lname && values.child_lname.length > 0 &&
                values.child_sex && values.child_sex.length > 0 &&
                values.child_dob !== null;
                
            const areAllParentInputsFilled = 
                values.parent_hn && values.parent_hn.length > 0 &&
                values.parent_fname && values.parent_fname.length > 0 &&
                values.parent_lname && values.parent_lname.length > 0 &&
                values.parent_sex && values.parent_sex.length > 0 &&
                values.parent_dob !== null;
            
            const isSomeChildInputFilled = 
                (values.child_fname && values.child_fname.length > 0) ||
                (values.child_lname && values.child_lname.length > 0) ||
                (values.child_sex && values.child_sex.length > 0) ||
                values.child_dob !== null;
                
            const isSomeParentInputFilled = 
                (values.parent_fname && values.parent_fname.length > 0) ||
                (values.parent_lname && values.parent_lname.length > 0) ||
                (values.parent_sex && values.parent_sex.length > 0) ||
                values.parent_dob !== null;
            
            // Condition 1: Both HNs filled, no other inputs needed
            if (isChildHnFilled && isParentHnFilled && !isSomeChildInputFilled && !isSomeParentInputFilled) {
                return errors; // Valid, can submit
            }
            
            // Condition 2: patient is "child" and all child inputs are filled
            if (patient === "child" && areAllChildInputsFilled) {
                return errors; // Valid, can submit
            }
            
            // Condition 3: patient is "parent" and all parent inputs are filled
            if (patient === "parent" && areAllParentInputsFilled) {
                return errors; // Valid, can submit
            }
            
            // Condition 4 & 5: Both HNs filled but incomplete patient data
            if (isChildHnFilled && isParentHnFilled) {
                if (patient === "child") {
                    if (isSomeChildInputFilled && !areAllChildInputsFilled) {
                        // Some child inputs filled but not all
                        if (!values.child_fname || values.child_fname.length === 0) {
                            errors.child_fname = "Child's first name is required when other child data is provided";
                        }
                        if (!values.child_lname || values.child_lname.length === 0) {
                            errors.child_lname = "Child's last name is required when other child data is provided";
                        }
                        if (!values.child_sex || values.child_sex.length === 0) {
                            errors.child_sex = "Child's sex is required when other child data is provided";
                        }
                        if (values.child_dob === null) {
                            errors.child_dob = "Child's date of birth is required when other child data is provided";
                        }
                    }
                } else if (patient === "parent") {
                    if (isSomeParentInputFilled && !areAllParentInputsFilled) {
                        // Some parent inputs filled but not all
                        if (!values.parent_fname || values.parent_fname.length === 0) {
                            errors.parent_fname = "Parent's first name is required when other parent data is provided";
                        }
                        if (!values.parent_lname || values.parent_lname.length === 0) {
                            errors.parent_lname = "Parent's last name is required when other parent data is provided";
                        }
                        if (!values.parent_sex || values.parent_sex.length === 0) {
                            errors.parent_sex = "Parent's sex is required when other parent data is provided";
                        }
                        if (values.parent_dob === null) {
                            errors.parent_dob = "Parent's date of birth is required when other parent data is provided";
                        }
                    }
                }
                
                return errors;
            }
            
            // Condition 6: Otherwise, apply standard validation based on patient type
            if (patient === "child") {
                if (!values.child_hn || values.child_hn.length === 0) {
                    errors.child_hn = "Child's hospital number is required";
                }
                if (!values.child_fname || values.child_fname.length === 0) {
                    errors.child_fname = "Child's first name is required";
                }
                if (!values.child_lname || values.child_lname.length === 0) {
                    errors.child_lname = "Child's last name is required";
                }
                if (!values.child_sex || values.child_sex.length === 0) {
                    errors.child_sex = "Child's sex is required";
                }
                if (values.child_dob === null) {
                    errors.child_dob = "Child's date of birth is required";
                }
            } else if (patient === "parent") {
                if (!values.parent_hn || values.parent_hn.length === 0) {
                    errors.parent_hn = "Parent's hospital number is required";
                }
                if (!values.parent_fname || values.parent_fname.length === 0) {
                    errors.parent_fname = "Parent's first name is required";
                }
                if (!values.parent_lname || values.parent_lname.length === 0) {
                    errors.parent_lname = "Parent's last name is required";
                }
                if (!values.parent_sex || values.parent_sex.length === 0) {
                    errors.parent_sex = "Parent's sex is required";
                }
                if (values.parent_dob === null) {
                    errors.parent_dob = "Parent's date of birth is required";
                }
            }
            
            return errors;
        }
    });

    React.useEffect(()=>{
        setRecord(IRecordChildParentInit)
        form.reset()
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
        form.reset()
    }

    const handleSubmit = async (values: IRecordChildParent) => {
        setLoading(true)
        const record: IRecordChildParent = values

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
            console.log(currentRecord)
            const hn = currentRecord.hn

            // Check if user filled out the Full Profile
            const isFullProfile = 
                currentRecord.firstname && 
                currentRecord.lastname && 
                currentRecord.sex && 
                currentRecord.dob;

            const hasRelation:boolean = (patient === "child" ?
                record.parent_hn.trim() !== "" :
                record.child_hn.trim() !== ""
            )

            // 1. Validation
            if (!hn) {
                throw new Error("Hospital Number (HN) is required.");
            }

            if (!isFullProfile && !hasRelation) {
                throw new Error("Please fill all fields to register");
            }

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
                    dob: (currentRecord.dob).toISOString().split('T')[0] 
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
                        throw new Error(`The HN "${hn}" is already registered.`);
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
                const p_hn = patient === "child" ? record.parent_hn : hn as string;
                const c_hn = patient === "child" ? hn as string : record.child_hn;

                const linkRes = await window.electronAPI.linkParentChild(p_hn, c_hn);

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
            form.reset()
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
            <form 
                onSubmit={form.onSubmit((values) => handleSubmit(values))}
                onReset={handleReset}
            >
            <Box component="div" p={"md"}>
                <Flex 
                    direction={"column"} 
                    align={"center"} 
                    p={"sm"}
                >
                    <Title order={3}>Record</Title>
                    <PatientModeSelector patient={patient} setPatient={setPatient} />
                    
                    {/* Record Fill Container */}
                    <MantineProvider theme={{primaryColor:(patient === "child" ? "orange" : "green")}}>
                        <Box 
                            component='div'
                            maw={"75%"}
                            p={"sm"} 
                            m={"sm"}
                            bd={`5px solid ${patient === "child" ? "orange" : "green"}`}
                            bdrs={"md"}
                            style={{
                                transition: "border-color 0.3s ease"
                            }}
                        >
                            {/* Header with Relation Input */}
                            <Title order={4}>
                                <Group>
                                    {patient === "child" ? "Child Record" : "Parent Record"}
                                    {patient === "child" ? <MdChildCare size={20}/> : <IoIosPerson size={20}/>}
                                </Group>
                            </Title>
                            <RecordFill 
                                record={record} 
                                setRecord={setRecord}
                                patient={patient}
                                form={form}
                            />
                            {/* button step controller */}
                            <Group
                                justify={"center"} 
                            >
                                <Button
                                    variant="filled" 
                                    color="yellow" 
                                    size="md"
                                    type="reset"
                                >
                                    Reset
                                </Button>
                                <Button 
                                    variant="filled" 
                                    color="green" 
                                    size="md"
                                    loading={loading}
                                    type="submit"  
                                >
                                    Submit
                                </Button>
                            </Group>
                        </Box>
                    </MantineProvider>
                </Flex>
            </Box>

            </form>
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