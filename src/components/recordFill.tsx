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
import IRecord from '../interface/IRecord';

function RecordFill(
    {record, setRecord}:{
    record:IRecord,
    setRecord:React.Dispatch<React.SetStateAction<IRecord>>
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
                value={record.hn}
                onChange={(event)=>setRecord({
                    ...record,
                    hn: event.currentTarget.value
                })}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}></Grid.Col>
        <Grid.Col span={6}>
            <TextInput
                label="First name"
                placeholder="Enter first name"
                value={record.firstname}
                onChange={(event)=>setRecord({
                    ...record,
                    firstname: event.currentTarget.value
                })}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <TextInput
                label="Last name"
                placeholder="Enter last name"
                value={record.lastname}
                onChange={(event)=>setRecord({
                    ...record,
                    lastname: event.currentTarget.value
                })}
                required
            />
        </Grid.Col>
        <Grid.Col span={6}>
            <NumberInput
                label="Age"
                placeholder="Enter age"
                value={record.age}
                onChange={(value:number)=>setRecord({
                    ...record,
                    age: value
                })}
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
                    value={record.dob}
                    maxDate={dayjs().format('YYYY-MM-DD')}
                    onChange={(value)=>setRecord({
                    ...record,
                    dob: dayjs(value).toDate()
                })}
                    required
                />
            </DatesProvider>
        </Grid.Col>
        <Grid.Col span={6}>
            <Radio.Group
                // name={}
                label="Sex"
                value={record.sex}
                onChange={(value)=>setRecord({
                    ...record,
                    sex: value
                })}
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