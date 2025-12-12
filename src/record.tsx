import React from 'react'
import { 
    Box, 
    Text,
    Title,
    Grid,
    Button,
    Select,
    Group,
    Radio,
    Input,
    NumberInput,
    Table
} from '@mantine/core'
import { 
    DateInput,
    DatesProvider
} from '@mantine/dates';
import dayjs from 'dayjs';


function Record() {

    return (
        <Box component='div' p={"sm"}>

            {/* Section Filter */}
            <Box component='div' p={"sm"} m={"xs"} bd={"2px black solid"} bdrs={"sm"}>
                <Title order={4}>Filter</Title>
                <Grid
                    // wrap="wrap"
                    // bd="1px red solid"
                    h="100%"
                    p="md"
                    align='end'
                >
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Hospital Number">
                            <Input placeholder="Enter hospital number"/>
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Firstname">
                            <Input placeholder="Enter firstname"/>
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Lastname">
                            <Input placeholder="Enter lastname"/>
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <NumberInput
                            label="Age"
                            placeholder="Enter age"
                            min={0}
                            max={150}
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
                            />
                        </DatesProvider>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Radio.Group
                            name="sexSelection"
                            label="Sex"
                        >
                            <Group mt="xs">
                                <Radio value="M" label="Male" />
                                <Radio value="F" label="Female" />
                            </Group>
                        </Radio.Group>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Relation ID">
                            <Input placeholder="Enter relation id"/>
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Group grow justify="space-between">
                            <Button variant='filled' color='yellow'>Reset</Button>
                            <Button variant='filled' color='green'>Show</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Box>

            {/* patients table */}
            <Box 
                component='div'
                p={"sm"} 
                m={"xs"} 
                bd={"2px black solid"} 
                bdrs={"sm"}
                h={"25svh"}
            >
                <Title order={4}>patients</Title>
                <Table.ScrollContainer minWidth={"100%"}>
                    <Table stickyHeader withTableBorder layout="fixed">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>hn</Table.Th>
                                <Table.Th>firstname</Table.Th>
                                <Table.Th>lastname</Table.Th>
                                <Table.Th>age</Table.Th>
                                <Table.Th>sex</Table.Th>
                                <Table.Th>dob</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>

            {/* patient_relations */}
            <Box 
                component='div' 
                p={"sm"} 
                m={"xs"} 
                bd={"2px black solid"} 
                bdrs={"sm"}
                h={"25svh"}
            >
                <Title order={4}>patient_relations</Title>
                <Table.ScrollContainer minWidth={"100%"}>
                    <Table stickyHeader withTableBorder layout="fixed">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>relation_id</Table.Th>
                                <Table.Th>child_hn</Table.Th>
                                <Table.Th>parent_hb</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>
        </Box>
    )
}

export default Record