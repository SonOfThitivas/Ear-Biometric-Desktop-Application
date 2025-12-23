import React, { ChangeEvent } from 'react'
import { 
    Group,
    Grid,
    TextInput,
    NumberInput,
    Radio,
} from "@mantine/core";
import {
    DatesProvider,
    DateInput
} from "@mantine/dates";
import dayjs from 'dayjs';
import { IRecordChildParent } from '../interface/IRecord';

function RecordFill(
    {record, setRecord, patient}:{
    record:IRecordChildParent,
    setRecord:React.Dispatch<React.SetStateAction<IRecordChildParent>>,
    patient:string,
}) {

    return (
    <Grid
        // wrap="wrap"
        // bd="1px red solid"
        h="100%"
        p="md"
        align='end'
    >
        <Grid.Col span={6}>
            <TextInput
                label="Hospital Number"
                placeholder="Enter hospital number"
                value={patient === "child" ? record.child_hn : record.parent_hn}
                onChange={(event)=>{
                    if (patient === "child") setRecord({...record,child_hn: event.currentTarget.value})
                    else setRecord({...record,parent_hn: event.currentTarget.value})
                }}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <TextInput
                label={patient === "child" ? "Link with Parent's Hospital Number" : "Link with Child's Hospital Number"}
                placeholder="Enter hospital number"
                value={patient === "parent" ? record.child_hn : record.parent_hn}
                onChange={(event)=>{
                    if (patient === "parent") setRecord({...record,child_hn: event.currentTarget.value})
                    else setRecord({...record,parent_hn: event.currentTarget.value})
                }}
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <TextInput
                label="First name"
                placeholder="Enter first name"
                value={patient === "child" ? record.child_fname : record.parent_fname}
                onChange={(event)=>{
                    if (patient === "child")setRecord({...record,child_fname: event.currentTarget.value})
                    else setRecord({...record,parent_fname: event.currentTarget.value})}}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <TextInput
                label="Last name"
                placeholder="Enter last name"
                value={patient === "child" ? record.child_lname : record.parent_lname}
                onChange={(event)=>{
                    if (patient === "child") setRecord({...record, child_lname: event.currentTarget.value})
                    else setRecord({...record, parent_lname: event.currentTarget.value})
                    }
                }
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <NumberInput
                label="Age"
                placeholder="Enter age"
                value={patient === "child" ? record.child_age : record.parent_age}
                onChange={(value:number)=>{
                    if (patient === "child") setRecord({...record, child_age: value})
                    else setRecord({...record, parent_age: value})
                }}
                min={0}
                max={150}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <DatesProvider settings={{locale:"en"}}>
                <DateInput
                    // value={}
                    // onChange={}
                    valueFormat='DD MMM YYYY'
                    label="Date of Birth"
                    placeholder="DD MMM YYYY"
                    value={patient === "child" ? record.child_dob : record.parent_dob}
                    maxDate={dayjs().format('YYYY-MM-DD')}
                    onChange={(value)=>{
                        if (patient === "child") setRecord({...record, child_dob: dayjs(value).toDate()})
                        else setRecord({...record, parent_dob:dayjs(value).toDate()})
                    }}
                    required
                />
            </DatesProvider>
        </Grid.Col>
        <Grid.Col span={6}>
            <Radio.Group
                // name={}
                label="Sex"
                value={patient === "child" ? record.child_sex : record.parent_sex}
                onChange={(value)=>{
                    if (patient === "child") setRecord({...record, child_sex:value})
                    else setRecord({...record, parent_sex:value})
                }}
                required
            >
                <Group mt="xs">
                    <Radio value="M" label="Male" />
                    <Radio value="F" label="Female" />
                </Group>
            </Radio.Group>
        </Grid.Col>
    </Grid>
  )
}

export default RecordFill