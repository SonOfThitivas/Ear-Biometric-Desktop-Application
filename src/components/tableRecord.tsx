import React from 'react'
import { 
    Box,
    Title,
    Table,
} from '@mantine/core'
import dayjs from 'dayjs'
import "dayjs/locale/th"
import { IRecordChildParent } from 'src/interface/IRecord'

function TableRecord({title, record=[]}:
    {
        title: string,
        record: IRecordChildParent[],
    }
) {

    const rows = record.map((data: IRecordChildParent)=>{
        if (title === "child") {
            return (
                <Table.Tr key={data.child_hn}>
                    <Table.Td>{data.child_hn}</Table.Td>
                    <Table.Td>{data.parent_hn}</Table.Td>
                    <Table.Td>{data.child_fname}</Table.Td>
                    <Table.Td>{data.child_lname}</Table.Td>
                    <Table.Td>{data.child_age}</Table.Td>
                    <Table.Td>{data.child_sex}</Table.Td>
                    <Table.Td>{dayjs(data.child_dob).format("DD MMM YYYY")}</Table.Td>
                </Table.Tr>
            )
        }else if (title === "parent") {
            return (
                <Table.Tr key={data.parent_hn}>
                    <Table.Td>{data.parent_hn}</Table.Td>
                    <Table.Td>{data.child_hn}</Table.Td>
                    <Table.Td>{data.parent_fname}</Table.Td>
                    <Table.Td>{data.parent_lname}</Table.Td>
                    <Table.Td>{data.parent_age}</Table.Td>
                    <Table.Td>{data.parent_sex}</Table.Td>
                    <Table.Td>{dayjs(data.parent_dob).format("DD MMM YYYY")}</Table.Td>
                </Table.Tr>
            )
        } else {
            return <></>
        }
    })

    return (
        <Box 
            component='div'
            p={"sm"} 
            m={"xs"} 
            bd={"2px black solid"} 
            bdrs={"sm"}
            // h={"25svh"}
        >
            <Title order={4}>{title === "child" ? "Child" : "Parent"}</Title>
            <Table.ScrollContainer minWidth={"100%"} maxHeight={250}>
                <Table stickyHeader withTableBorder layout='fixed' striped highlightOnHover withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th bg={"gray.4"}>hn</Table.Th>
                            <Table.Th bg={"gray.4"}>{title === "child" ? "hn_parent" : "hn_child"}</Table.Th>
                            <Table.Th bg={"gray.4"}>firstname</Table.Th>
                            <Table.Th bg={"gray.4"}>lastname</Table.Th>
                            <Table.Th bg={"gray.4"}>age</Table.Th>
                            <Table.Th bg={"gray.4"}>sex</Table.Th>
                            <Table.Th bg={"gray.4"}>dob</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Box>  
    )
}

export default TableRecord