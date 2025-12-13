import React from 'react'
import { 
    Flex, 
    Group,
    Box, 
    Select,
    Button,
    Text,
    Switch,
} from '@mantine/core'

import TableResult from './components/tableResult'
import IRecord from "./interface/IRecord"
import Camera from './components/camera'

export default function Identify() {
    const [camera, setCamera] = React.useState<string>("")
    const [mode, setMode] = React.useState<string>("child")


    const childResult: IRecord = {
        hn: "123456789",
        firstname: "Somsak",
        lastname: "Meesub",
        age: 1,
        sex: "M",
        dob: "1 January 2025",
    }

    const parentResult: IRecord = {
        hn: "987654321",
        firstname: "Somsri",
        lastname: "Meesub",
        age: 31,
        sex: "F",
        dob: "1 January 1995",
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
                />
                {/* button */}
                <Group grow justify={"space-between"} m={"sm"}>
                    <Button variant='filled' color='blue'>Detect</Button>
                    <Button variant='filled' color='green'>Confirm</Button>
                    <Button variant='filled' color='yellow'>Reset</Button>
                </Group>
            </Box>

            {/* result */}
            <Flex w={"100%"} maw={"100%"} direction={"column"} align={"center"} p={"sm"}>
                <Text size='xl' fw={500}>Result</Text>
                <Box component='div' bdrs={"sm"} w={"100%"}>
                    <Text size='sm' fw={500}>Child</Text>
                    <TableResult 
                        hn={childResult.hn}
                        firstname={childResult.firstname}
                        lastname={childResult.lastname}
                        age={childResult.age}
                        sex={childResult.sex}
                        dob={childResult.dob}
                    />
                </Box>
                <Box component='div' bdrs={"sm"} w={"100%"}>
                    <Text size='sm' fw={500}>Parent</Text>
                    <TableResult
                        hn={parentResult.hn}
                        firstname={parentResult.firstname}
                        lastname={parentResult.lastname}
                        age={parentResult.age}
                        sex={parentResult.sex}
                        dob={parentResult.dob}
                    />
                </Box>
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
            <Camera/>
        </Box>
    </Flex>
  )
}
