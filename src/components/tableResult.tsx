import React from 'react';

import { 
    Box,
    Table,
    Title
} from '@mantine/core';

import {IRecordChildParent} from '../interface/IRecord';
import dayjs from 'dayjs';

const recordInit: IRecordChildParent = {
    child_hn: "",
    child_fname: "",
    child_lname: "",
    child_age: null,
    child_sex: "",
    child_dob: null,
    parent_hn: "",
    parent_fname: "",
    parent_lname: "",
    parent_age: null,
    parent_sex: "",
    parent_dob: null
}

// table result component
const TableResult = ({record=recordInit}:
    {record:IRecordChildParent}) => {

    return(
        <>
            <Box component='div' bdrs={"sm"} w={"100%"}>
                <Title order={4}>Child</Title>
                <Table.ScrollContainer minWidth={"25%"}>
                    <Table variant="vertical" layout="auto" withTableBorder>
                        <Table.Tbody >
                            <Table.Tr>
                                <Table.Th maw={"25%"}>hn</Table.Th>
                                <Table.Td maw={"75%"}>{record.child_hn}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>firstname</Table.Th>
                                <Table.Td w={"75%"}>{record.child_fname}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>lastname</Table.Th>
                                <Table.Td w={"75%"}>{record.child_lname}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>age</Table.Th>
                                <Table.Td w={"75%"}>{record.child_age}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>sex</Table.Th>
                                <Table.Td w={"75%"}>{record.child_sex}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>dob</Table.Th>
                                <Table.Td w={"75%"}>{
                                    record.child_dob !== null ? dayjs(record.child_dob).format("DD MMM YYYY") : null
                                }</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>
            <Box component='div' bdrs={"sm"} w={"100%"}>
                <Title order={4}>Parent</Title>
                <Table.ScrollContainer minWidth={"25%"}>
                    <Table variant="vertical" layout="auto" withTableBorder>
                        <Table.Tbody >
                            <Table.Tr>
                                <Table.Th maw={"25%"}>hn</Table.Th>
                                <Table.Td maw={"75%"}>{record.parent_hn}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>firstname</Table.Th>
                                <Table.Td w={"75%"}>{record.parent_fname}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>lastname</Table.Th>
                                <Table.Td w={"75%"}>{record.parent_lname}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>age</Table.Th>
                                <Table.Td w={"75%"}>{record.parent_age}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>sex</Table.Th>
                                <Table.Td w={"75%"}>{record.parent_sex}</Table.Td>
                            </Table.Tr>

                            <Table.Tr>
                                <Table.Th w={"25%"}>dob</Table.Th>
                                <Table.Td w={"75%"}>{
                                    record.parent_dob !== null ? dayjs(record.parent_dob).format("DD MMM YYYY") : null
                                }</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>
        </>
    )
}

export default TableResult;