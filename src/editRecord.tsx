import React from 'react'
import {
  MantineProvider,
  Container,
  Paper,
  Title,
  Button,
  Group,
  Stack,
  Radio,
  TextInput,
  NumberInput,
  Grid,
  Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { notifications, Notifications } from '@mantine/notifications';
import IRecord, {IRecordInit, IRecordChildParent} from './interface/IRecord';
import PatientModeSelector from './components/patientMode';
import { MdChildCare, MdDateRange  } from "react-icons/md";
import { IoIosPerson, IoMdMale, IoMdFemale  } from "react-icons/io";

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
        validate: {
            hn: (value: string) => (value.trim().length === 0 ? 'Hospital number is required' : null),
            firstname: (value: string) => (value.trim().length === 0 ? 'First name is required' : null),
            lastname: (value: string) => (value.trim().length === 0 ? 'Last name is required' : null),
            sex: (value:string) => (value.trim().length === 0 ? 'Sex is required' : null),
            dob: (value:Date) => (value === null ? 'Date of birth is required' : null),
        },
    });

    const handleHNSubmit = async (values: typeof formIdentifyStep.values) => {
        setLoading(true);

        try {
            // 1. Select the correct API based on the patient mode (child vs parent)
            let record: any = null;
            if (patient === "child") {
                record = await window.electronAPI.getChildByHN(values.hn);
            } else {
                record = await window.electronAPI.getParentByHN(values.hn);
            }
            
            // 2. Check if a record was returned (it will be null if not found)
            if (record) {
                // 3. Map the database columns to your form fields
                // The new queries return: hn_number, firstname, lastname, sex, age, dob
                const data: IRecord = {
                    hn: record.hn_number,
                    firstname: record.firstname,
                    lastname: record.lastname,
                    sex: record.sex,
                    age: record.age,
                    dob: new Date(record.dob) // Ensure it is a valid Date object for Mantine
                };

                formEditStep.setValues(data);
                setStep('edit');

            } else {
                notifications.show({
                    title:"Error",
                    message: 'Hospital Number not found in database. Please enter a valid HN.',
                    color:"red",
                    autoClose:4000,
                })
            }
        } catch (err) {
            notifications.show({
                title:"Error",
                message: 'An error occurred while fetching patient record. Please try again.',
                color:"red",
                autoClose:4000,
            })
        } finally {
            setLoading(false);
        }
    };

    const handleRecordSubmit = async (values: IRecord) => {
        setLoading(true);

        try {
            const hn = values.hn
            const data = {
                firstname: values.firstname,
                lastname: values.lastname,
                age: values.age,
                sex: values.sex,
                dob: values.dob.toISOString().split('T')[0],
            }
            
            let res:{success:boolean, message?:string, error?:string}
            if (patient === "child"){
                res = await window.electronAPI.updateChild(
                    hn,
                    data,
                    operatorNumber,
                )
            } else {
                res = await window.electronAPI.updateParent(
                    hn,
                    data,
                    operatorNumber,
                )
            }

            if (res.success) {
                notifications.show({
                    title: "Success",
                    message: "Record is updated succesfully.",
                    color: "green",
                    autoClose:4000,
                })
            } else {
                notifications.show({
                    title: "Error",
                    message: res.message ? res.message : res.error,
                    color: "red",
                    autoClose:4000,
                })
            }
        } catch (err) {
            notifications.show({
                title: "Error",
                message: err,
                color: "red",
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
            <Container size="sm" py="xl">
                <Paper 
                    shadow="md" 
                    p="xl" 
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
                            <Stack gap="md">
                                <Grid
                                    h="100%"
                                    p="md"
                                    align='end'
                                > 
                                    <Grid.Col span={6} >
                                        <TextInput
                                            label="Hospital Number (HN)"
                                            withAsterisk
                                            key={formEditStep.key("hn")}
                                            {...formEditStep.getInputProps('hn')}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}></Grid.Col>
                                    <Grid.Col span={6}>
                                        <TextInput
                                            label="First Name"
                                            placeholder="Enter first name"
                                            withAsterisk
                                            key={formEditStep.key("firstname")}
                                            {...formEditStep.getInputProps('firstname')}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <TextInput
                                            label="Last Name"
                                            placeholder="Enter last name"
                                            withAsterisk
                                            key={formEditStep.key("lastname")}
                                            {...formEditStep.getInputProps('lastname')}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <NumberInput
                                            label="Age"
                                            placeholder="Enter age"
                                            withAsterisk
                                            min={0}
                                            max={150}
                                            key={formEditStep.key("age")}
                                            {...formEditStep.getInputProps('age')}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <DateInput
                                            label="Date of Birth"
                                            placeholder="Select date"
                                            leftSection={<MdDateRange size={20} color='black'/>}
                                            withAsterisk
                                            key={formEditStep.key("dob")}
                                            {...formEditStep.getInputProps('dob')}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Radio.Group
                                            label="Sex"
                                            withAsterisk
                                            key={formEditStep.key("sex")}
                                            {...formEditStep.getInputProps('sex')}
                                        >
                                            <Group mt="xs">
                                            <Radio value="M" label={<Group><IoMdMale size={20}/>Male</Group>} />
                                            <Radio value="F" label={<Group><IoMdFemale size={20}/>Female</Group>} />
                                            </Group>
                                        </Radio.Group>
                                    </Grid.Col>
                                    
                                </Grid>

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
                            </Stack>
                        </form>
                    )}
                </Paper>
                <Notifications/>
            </Container>
        </MantineProvider>
    );
}

export default EditRecord