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
import { IRecordChildParent } from '../interface/IRecord';
import { UseFormReturnType } from '@mantine/form';
import { MdChildCare, MdDateRange  } from "react-icons/md";
import { IoIosPerson, IoMdMale, IoMdFemale  } from "react-icons/io";

function RecordFill(
    {record, setRecord, patient, form}:{
    record:IRecordChildParent,
    setRecord:React.Dispatch<React.SetStateAction<IRecordChildParent>>,
    patient:string,
    form: UseFormReturnType<IRecordChildParent, (values: IRecordChildParent) => IRecordChildParent>
}) {

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
                        key={form.key(patient === "child" ? "child_hn" : "parent_hn")}
                        {...form.getInputProps(patient === "child" ? "child_hn" : "parent_hn")}
                        withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label={patient === "child" ? "Link with Parent's Hospital Number" : "Link with Child's Hospital Number"}
                        placeholder="Enter hospital number"
                        leftSection={patient === "parent" ? <MdChildCare size={20} color='black'/> : <IoIosPerson size={20} color='black'/>}
                        key={form.key(patient === "parent" ? "child_hn" : "parent_hn")}
                        {...form.getInputProps(patient === "parent" ? "child_hn" : "parent_hn")}
                    />
                </Grid.Col>


                <Grid.Col span={3}>
                    <TextInput
                        label="First name"
                        placeholder="Enter first name"
                        key={form.key(patient === "child" ? "child_fname" : "parent_fname")}
                        {...form.getInputProps(patient === "child" ? "child_fname" : "parent_fname")}
                        withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Last name"
                        placeholder="Enter last name"
                        key={form.key(patient === "child" ? "child_lname" : "parent_lname")}
                        {...form.getInputProps(patient === "child" ? "child_lname" : "parent_lname")}
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
                        key={form.key(patient === "child" ? "child_age" : "parent_age")}
                        {...form.getInputProps(patient === "child" ? "child_age" : "parent_age")}
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
                            key={form.key(patient === "child" ? "child_dob" : "parent_dob")}
                            {...form.getInputProps(patient === "child" ? "child_dob" : "parent_dob")}
                            maxDate={new Date()}
                            clearable
                            // withAsterisk
                        />
                    </DatesProvider>
                </Grid.Col>

                <Grid.Col span={3}>
                    <Radio.Group
                        label="Sex"
                        key={form.key(patient === "child" ? "child_sex" : "parent_sex")}
                        {...form.getInputProps(patient === "child" ? "child_sex" : "parent_sex")}
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
                        key={form.key(patient === "child" ? "child_nationality" : "parent_nationality")}
                        {...form.getInputProps(patient === "child" ? "child_nationality" : "parent_nationality")}
                        // withAsterisk
                    />
                </Grid.Col>


                <Grid.Col span={6}>
                    <Textarea
                        label="Address"
                        autosize
                        minRows={1}
                        placeholder="Enter address"
                        key={form.key(patient === "child" ? "child_address" : "parent_address")}
                        {...form.getInputProps(patient === "child" ? "child_address" : "parent_address")}
                        // withAsterisk
                    />
                </Grid.Col>

                 <Grid.Col span={3}>
                    <TextInput
                        label="Born Detail"
                        placeholder="Enter born detail"
                        key={form.key(patient === "child" ? "child_born_detail" : "parent_born_detail")}
                        {...form.getInputProps(patient === "child" ? "child_born_detail" : "parent_born_detail")}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Born Weight"
                        placeholder="Enter born weight"
                        key={form.key(patient === "child" ? "child_born_weight" : "parent_born_weight")}
                        {...form.getInputProps(patient === "child" ? "child_born_weight" : "parent_born_weight")}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Weight Now"
                        placeholder="Enter weight now"
                        key={form.key(patient === "child" ? "child_weight_now" : "parent_weight_now")}
                        {...form.getInputProps(patient === "child" ? "child_weight_now" : "parent_weight_now")}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Height"
                        placeholder="Enter height"
                        key={form.key(patient === "child" ? "child_height_length" : "parent_height_length")}
                        {...form.getInputProps(patient === "child" ? "child_height_length" : "parent_height_length")}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <TextInput
                        label="Integrity"
                        placeholder="Enter integrity"
                        key={form.key(patient === "child" ? "child_integrity" : "parent_integrity")}
                        {...form.getInputProps(patient === "child" ? "child_integrity" : "parent_integrity")}
                        // withAsterisk
                    />
                </Grid.Col>

                <Grid.Col span={3}>
                    <Textarea
                        label="Note"
                        autosize
                        minRows={1}
                        placeholder="Enter note"
                        key={form.key(patient === "child" ? "child_data" : "parent_data")}
                        {...form.getInputProps(patient === "child" ? "child_data" : "parent_data")}
                        // withAsterisk
                    />
                </Grid.Col>

            </Grid>
        </Input.Wrapper>
  )
}

export default RecordFill