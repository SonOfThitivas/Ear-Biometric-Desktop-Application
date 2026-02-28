import React from 'react'
import { 
    Group,
    Grid,
    TextInput,
    NumberInput,
    Radio,
    Input,
    Textarea,
} from "@mantine/core";
import {
    DatesProvider,
    DateInput
} from "@mantine/dates";
import { IRecordChildParent} from '../interface/IRecord';
import IRecord from '../interface/IRecord';
import { UseFormReturnType } from '@mantine/form';
import { MdChildCare, MdDateRange  } from "react-icons/md";
import { IoIosPerson, IoMdMale, IoMdFemale  } from "react-icons/io";

// Define Values for the compiler
type Values = Record<string, unknown>;

function RecordFill(
    // ✅ 1. Rename 'form' to 'strictForm' exactly at the prop level
    {record, setRecord, patient, form: strictForm}:{ 
    record?:IRecordChildParent,
    setRecord?:React.Dispatch<React.SetStateAction<IRecordChildParent>>,
    patient:string,
    form: UseFormReturnType<IRecordChildParent, (values: IRecordChildParent) => Values> |
          UseFormReturnType<IRecord, (values: IRecord) => Values>
}) {
    // ✅ 2. Create a local 'form' variable that ignores the union rule
    const form = strictForm as any;

    // Determine if form is IRecordChildParent or IRecord type
    const isChildParentForm = 'child_hn' in form.values || 'parent_hn' in form.values;
    
    // Helper to get the correct field name based on form type
    const getFieldName = (baseName: string, prefix?: string): string => {
        if (isChildParentForm && prefix) {
            return `${prefix}_${baseName}`;
        }
        
        // Map short names to full names for IRecord
        const nameMap: Record<string, string> = {
            'fname': 'firstname',
            'lname': 'lastname',
        };
        
        return nameMap[baseName] || baseName;
    };

    return (
        <Input.Wrapper>
            <Grid
                h="100%"
                p="md"
                align='start'
            >   
        
                <Grid.Col span={3}>
                    <TextInput
                        label="Hospital Number"
                        placeholder="Enter hospital number"
                        leftSection={patient === "child" ? <MdChildCare size={20} color='black'/> : <IoIosPerson size={20} color='black'/>}
                        key={form.key(getFieldName("hn", patient))}
                        {...form.getInputProps(getFieldName("hn", patient) as any)}
                        withAsterisk
                    />
                </Grid.Col>
                {isChildParentForm && <Grid.Col span={3}>
                    <TextInput
                        label={patient === "child" ? "Link with Parent's Hospital Number" : "Link with Child's Hospital Number"}
                        placeholder="Enter hospital number"
                        leftSection={patient === "parent" ? <MdChildCare size={20} color='black'/> : <IoIosPerson size={20} color='black'/>}
                        key={form.key(getFieldName("hn", patient === "parent" ? "child" : "parent"))}
                        {...form.getInputProps(getFieldName("hn", patient === "parent" ? "child" : "parent") as any)}
                    />
                </Grid.Col> || <Grid.Col span={3}></Grid.Col>}
                <Grid.Col span={6}></Grid.Col>
                <Grid.Col span={3}>
                    <TextInput
                        label="First name"
                        placeholder="Enter first name"
                        key={form.key(getFieldName("fname", patient))}
                        {...form.getInputProps(getFieldName("fname", patient) as any)}
                        withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Last name"
                        placeholder="Enter last name"
                        key={form.key(getFieldName("lname", patient))}
                        {...form.getInputProps(getFieldName("lname", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                {/* <Grid.Col span={3}>
                    <NumberInput
                        label="Age"
                        placeholder="Enter age"
                        key={form.key(patient === "child" ? "child_age" : "parent_age")}
                        {...form.getInputProps(patient === "child" ? "child_age" : "parent_age")}
                        min={0}
                        max={150}
                        withAsterisk
                    />
                </Grid.Col> */}

                <Grid.Col span={3}>
                    <TextInput
                        label="Age"
                        placeholder="Enter age"
                        key={form.key(getFieldName("age", patient))}
                        {...form.getInputProps(getFieldName("age", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <DatesProvider settings={{locale:"en"}}>
                        <DateInput
                            valueFormat='DD MMM YYYY'
                            label="Date of Birth"
                            placeholder="DD MMM YYYY"
                            leftSection={<MdDateRange size={20} color='black'/>}
                            key={form.key(getFieldName("dob", patient))}
                            {...form.getInputProps(getFieldName("dob", patient) as any)}
                            maxDate={new Date()}
                            clearable
                            // withAsterisk
                        />
                    </DatesProvider>
                </Grid.Col>

                <Grid.Col span={3}>
                    <Radio.Group
                        label="Sex"
                        key={form.key(getFieldName("sex", patient))}
                        {...form.getInputProps(getFieldName("sex", patient) as any)}
                        withAsterisk
                    >
                        <Group mt="xs">
                            <Radio value="M" label={<Group><IoMdMale size={20}/>Male</Group>}/>
                            <Radio value="F" label={<Group><IoMdFemale size={20}/>Female</Group>} />
                        </Group>
                    </Radio.Group>
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Nationality"
                        placeholder="Enter nationality"
                        key={form.key(getFieldName("nationality", patient))}
                        {...form.getInputProps(getFieldName("nationality", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>


                <Grid.Col span={6} >
                    <Textarea
                        label="Address"
                        autosize
                        resize="vertical"
                        minRows={1}
                        placeholder="Enter address"
                        key={form.key(getFieldName("address", patient))}
                        {...form.getInputProps(getFieldName("address", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                 <Grid.Col span={3}>
                    <TextInput
                        label="Born Detail"
                        placeholder="Enter born detail"
                        key={form.key(getFieldName("born_detail", patient))}
                        {...form.getInputProps(getFieldName("born_detail", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Born Weight (kg)"
                        placeholder="Enter born weight"
                        key={form.key(getFieldName("born_weight", patient))}
                        {...form.getInputProps(getFieldName("born_weight", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Now Weight (kg)"
                        placeholder="Enter now weight"
                        key={form.key(getFieldName("weight_now", patient))}
                        {...form.getInputProps(getFieldName("weight_now", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Height (cm)"
                        placeholder="Enter height"
                        key={form.key(getFieldName("height_length", patient))}
                        {...form.getInputProps(getFieldName("height_length", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Integrity"
                        placeholder="Enter integrity"
                        key={form.key(getFieldName("integrity", patient))}
                        {...form.getInputProps(getFieldName("integrity", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={9}>
                    <Textarea
                        label="Note"
                        autosize
                        resize='vertical'
                        minRows={1}
                        placeholder="Enter note"
                        key={form.key(getFieldName("data", patient))}
                        {...form.getInputProps(getFieldName("data", patient) as any)}
                        // withAsterisk
                    />
                </Grid.Col>

            </Grid>
        </Input.Wrapper>
  )
}

export default RecordFill