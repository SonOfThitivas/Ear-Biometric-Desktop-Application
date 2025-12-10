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
import IResult from '../interface/IResult';

function RecordFill(
    {record, setRecord}:{
    record:IResult,
    setRecord:React.Dispatch<React.SetStateAction<IResult>>
}) {

    return (
    <Grid
        // wrap="wrap"
        // bd="1px red solid"
        h="100%"
        p="md"
        align='end'
    >
        <Grid.Col span={4}>
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
        <Grid.Col span={4}>
            <TextInput
                label="First name"
                placeholder="Enter firstname"
                value={record.firstname}
                onChange={(event)=>setRecord({
                    ...record,
                    firstname: event.currentTarget.value
                })}
                required
            />
        </Grid.Col>
        <Grid.Col span={4}>
            <TextInput
                label="Last name"
                placeholder="Enter lastname"
                value={record.lastname}
                onChange={(event)=>setRecord({
                    ...record,
                    lastname: event.currentTarget.value
                })}
                required
            />
        </Grid.Col>
        <Grid.Col span={4}>
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
        <Grid.Col span={4}>
            <DatesProvider settings={{locale:"th"}}>
                <DateInput
                    // value={}
                    // onChange={}
                    valueFormat='DD/MM/YYYY'
                    clearable
                    label="Date of Birth"
                    placeholder="DD/MM/YYYY"
                    value={record.dob}
                    maxDate={dayjs().format('YYYY-MM-DD')}
                    onChange={(value)=>setRecord({
                    ...record,
                    dob: value
                })}
                    required
                />
            </DatesProvider>
        </Grid.Col>
        <Grid.Col span={4}>
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