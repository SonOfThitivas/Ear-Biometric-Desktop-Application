import React from 'react'
import { 
    Box,
    Title,
    Table,
    Text,
} from '@mantine/core'
import dayjs from 'dayjs'
import "dayjs/locale/th"
import { IRecordChildParent } from '../interface/IRecord' // Fixed path (removed src/)

function TableRecord({title, record=[]}:
    {
        title: string,
        record: IRecordChildParent[],
    }
) {

    const rows = record.map((data: IRecordChildParent, index: number) => {
        // --- CHILD TABLE LOGIC ---
        if (title === "child") {
            if (!data.child_hn) return null;

            // FIX: Use `${data.child_hn}-${index}` to guarantee unique keys
            return (
                <Table.Tr key={`${data.child_hn}-${index}`}>
                    <Table.Td>{data.child_hn}</Table.Td>
                    <Table.Td>
                        {data.parent_hn ? (
                            data.parent_hn 
                        ) : (
                            <Text size="sm" c="dimmed" fs="italic">No Parent</Text>
                        )}
                    </Table.Td>
                    <Table.Td>{data.child_fname}</Table.Td>
                    <Table.Td>{data.child_lname}</Table.Td>
                    <Table.Td>{data.child_age}</Table.Td>
                    <Table.Td>{data.child_sex}</Table.Td>
                    <Table.Td>
                        {data.child_dob ? dayjs(data.child_dob).format("DD MMM YYYY") : "-"}
                    </Table.Td>
                </Table.Tr>
            )
        } 
        
        // --- PARENT TABLE LOGIC ---
        else if (title === "parent") {
            if (!data.parent_hn) return null;

            // FIX: Use `${data.parent_hn}-${index}` to guarantee unique keys
            return (
                <Table.Tr key={`${data.parent_hn}-${index}`}>
                    <Table.Td>{data.parent_hn}</Table.Td>
                    <Table.Td>
                        {data.child_hn ? (
                            data.child_hn
                        ) : (
                            <Text size="sm" c="dimmed" fs="italic">No Child</Text>
                        )}
                    </Table.Td>
                    <Table.Td>{data.parent_fname}</Table.Td>
                    <Table.Td>{data.parent_lname}</Table.Td>
                    <Table.Td>{data.parent_age}</Table.Td>
                    <Table.Td>{data.parent_sex}</Table.Td>
                    <Table.Td>
                        {data.parent_dob ? dayjs(data.parent_dob).format("DD MMM YYYY") : "-"}
                    </Table.Td>
                </Table.Tr>
            )
        } 
        
        return null;
    })

    return (
        <Box 
            component='div'
            p={"sm"} 
            m={"xs"} 
            bd={"2px black solid"} 
            bdrs={"sm"}
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
                        {(!record || record.length === 0) && (
                            <Table.Tr>
                                <Table.Td colSpan={7} style={{textAlign: 'center', color: 'gray'}}>
                                    No data
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Box>  
    )
}

export default TableRecord