import React from 'react'
import {
  MantineProvider,
  Container,
  Box,
  Paper,
  Title,
  Button,
  Group,
  Stack,
  Radio,
  TextInput,
  Grid,
  Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications, Notifications } from '@mantine/notifications';
import IRecord, {IRecordInit,} from './interface/IRecord';
import PatientModeSelector from './components/patientMode';
import RecordFill from './components/recordFill';
import { MdChildCare,  } from "react-icons/md";
import { IoIosPerson, } from "react-icons/io";

// 1. IMPORT THE NEW API
import { webAPI } from './web-api';

function EditRecord({operatorNumber}:{operatorNumber:string}) {
    const [step, setStep] = React.useState<'identify' | 'edit'>('identify');
    const [patient, setPatient] = React.useState<"child" | "parent">("child");
    const [loading, setLoading] = React.useState(false);

    const formIdentifyStep = useForm({
        mode: 'uncontrolled',
        initialValues: {
            hn: "",
        },

        validate: {
            hn: (value) => value.length === 0 ? "Hospital Number is required" : null,
        },
    });
    
    const formEditStep = useForm<IRecord>({
        mode: "uncontrolled",
        initialValues: IRecordInit,
        transformValues: (values:IRecord) => ({
            ...values,
            dob: values.dob ? new Date(values.dob) : null,
        }),
        validate: {
            hn: (value: string) => (value.trim().length === 0 ? 'Hospital number is required' : null),
            firstname: (value: string) => (value.trim().length === 0 ? 'First name is required' : null),
            // lastname: (value: string) => (value.trim().length === 0 ? 'Last name is required' : null),
            sex: (value:string) => (value.trim().length === 0 ? 'Sex is required' : null),
            // dob: (value:Date) => (value === null ? 'Date of birth is required' : null),
        },
    });

    const handleHNSubmit = async (values: typeof formIdentifyStep.values) => {
        setLoading(true);

        try {
            // 2. USE WEB API
            let record: any = null;
            if (patient === "child") {
                record = await webAPI.getChildByHN(values.hn);
            } else {
                record = await webAPI.getParentByHN(values.hn);
            }
            
            // 2. Check if a record was returned (it will be null if not found)
            if (record) {
                // 3. Map the database columns to your form fields
                const data: IRecord = {
                    hn: record.hn_number,
                    firstname: record.firstname,
                    lastname: record.lastname,
                    sex: record.sex,
                    age_text: record.age_text,
                    dob: record.dob !== null ? new Date(record.dob) : null, 
                    nationality: record.nationality,
                    address: record.address,
                    born_detail: record.born_detail,
                    born_weight: record.born_weight,
                    weight_now: record.weight_now,
                    height_length: record.height_length,
                    integrity: record.integrity,
                    data: record.data,
                };
                console.log(data)
                
                formEditStep.setValues(data);
                setStep('edit');

            } else {
                notifications.show({
                    id: "edit-record-error-id-hn-not-found",
                    title:"Error",
                    message: 'Hospital Number not found in database. Please enter a valid HN.',
                    color:"red",
                    bg: "red.1",
                    autoClose:4000,
                })
            }
        } catch (err) {
            notifications.show({
                id: "edit-record-error-id-hn",
                title:"Error",
                message: err.message,
                color:"red",
                bg:"red.1",
                autoClose:4000,
            })
        } finally {
            setLoading(false);
        }
    };

    const handleRecordSubmit = async (values: typeof formEditStep.values) => {
        setLoading(true);

        try {
            const hn = values.hn
            const data: IRecord = {
                firstname: values.firstname,
                lastname: values.lastname,
                age_text: values.age_text,
                sex: values.sex,
                dob: values.dob !== null ? values.dob.toString().split('T')[0] : null,
                nationality: values.nationality,
                address: values.address,
                born_detail: values.born_detail,
                born_weight: values.born_weight,
                weight_now: values.weight_now,
                height_length: values.height_length,
                integrity: values.integrity,
                data: values.data,

            }
            
            // 3. USE WEB API UPDATE
            console.log("[Data] ", data)
            let res:{success:boolean, message?:string, error?:string}
            if (patient === "child"){
                res = await webAPI.updateChild(
                    hn,
                    data,
                    operatorNumber,
                )
            } else {
                res = await webAPI.updateParent(
                    hn,
                    data,
                    operatorNumber,
                )
            }

            if (res.success) {
                notifications.show({
                    id: "edit-record-edit-success-id",
                    title: "Success!",
                    message: "Record is updated succesfully.",
                    color: "green",
                    bg: "green.1",
                    autoClose:4000,
                })
            } else {
                notifications.show({
                    id: "edit-record-edit-error-id-1",
                    title: "Error!",
                    message: res.message ? res.message : res.error,
                    color: "red",
                    bg: "red.1",
                    autoClose:4000,
                })
            }
        } catch (err: any) {
            notifications.show({
                id: "edit-record-edit-error-id-2",
                title: "Error!",
                message: err.message,
                color: "red",
                bg: "red.1",
                autoClose:4000,
            })
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('identify');
        formEditStep.setValues(IRecordInit)
    };

    return (
        <MantineProvider theme={{primaryColor: (patient === "child" ? "orange" : "green")}}>
            <Box>
                <Paper 
                    shadow="md" 
                    p="xl" 
                    m="lg"
                    radius="md" 
                    bd={`3 solid ${patient === "child" ? "orange" : "green"}`}
                    style={{
                        transition: "border-color 0.3s ease"
                    }}
                >
                    <Title order={2} mb="xl" ta="center">
                        Patient Record Editor
                    </Title>

                    {step === 'identify' ? (
                        <form onSubmit={formIdentifyStep.onSubmit((values)=>handleHNSubmit(values))}>
                            <Stack gap="md">
                                
                                <PatientModeSelector title='Select Patient Record' patient={patient} setPatient={setPatient}></PatientModeSelector>

                                    <TextInput
                                        label="Hospital Number (HN)"
                                        placeholder="Enter Hospital Number"
                                        leftSection={patient === "child" ? <MdChildCare size={20} color='black'/> : <IoIosPerson size={20} color='black'/>}
                                        key={formIdentifyStep.key("hn")}
                                        {...formIdentifyStep.getInputProps('hn')}
                                        withAsterisk
                                    />

                                    <Button 
                                        fullWidth
                                        type='submit'
                                        loading={loading}
                                        style={{
                                            transition: "0.3s ease"
                                        }}
                                    >
                                        {loading ? <Loader size="sm" /> : 'Search Patient'}
                                    </Button>

                            </Stack>
                        </form>
                    ) : (
                        <form onSubmit={formEditStep.onSubmit((values)=>handleRecordSubmit(values))}>
                            <RecordFill patient={patient} form={formEditStep}/>
                            
                            <Group justify="space-between" mt="md">
                                <Button 
                                    color='red' 
                                    onClick={handleBack}
                                >
                                Back
                                </Button>
                                <Button
                                    type='submit'
                                    color='green'
                                >
                                    Save Changes
                                </Button>
                            </Group>

                        </form>
                        
                    )}
                </Paper>
                <Notifications/>
            </Box>
        </MantineProvider>
    );
}

export default EditRecord