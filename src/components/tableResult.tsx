import React from 'react';

import { Table } from '@mantine/core';

import IResult from '../interface/IResult';


// table result component
const TableResult = ({
    hn=null,
    firstname=null,
    lastname=null,
    age=null,
    sex=null,
    dob=null
}: IResult) => {


    return(
        <Table.ScrollContainer minWidth={"25%"}>
            <Table variant="vertical" layout="auto" withTableBorder>
                <Table.Tbody >
                    <Table.Tr>
                        <Table.Th maw={"25%"}>hn</Table.Th>
                        <Table.Td maw={"75%"}>{hn}</Table.Td>
                    </Table.Tr>

                    <Table.Tr>
                        <Table.Th w={"25%"}>firstname</Table.Th>
                        <Table.Td w={"75%"}>{firstname}</Table.Td>
                    </Table.Tr>

                    <Table.Tr>
                        <Table.Th w={"25%"}>lastname</Table.Th>
                        <Table.Td w={"75%"}>{lastname}</Table.Td>
                    </Table.Tr>

                    <Table.Tr>
                        <Table.Th w={"25%"}>age</Table.Th>
                        <Table.Td w={"75%"}>{age}</Table.Td>
                    </Table.Tr>

                    <Table.Tr>
                        <Table.Th w={"25%"}>sex</Table.Th>
                        <Table.Td w={"75%"}>{sex}</Table.Td>
                    </Table.Tr>

                    <Table.Tr>
                        <Table.Th w={"25%"}>dob</Table.Th>
                        <Table.Td w={"75%"}>{dob}</Table.Td>
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    )
}

export default TableResult;