import React from 'react'
import { 
    Box,
    Title,
    Table,
    Text,
    Flex,
    Center,
    Space,
    Group,
} from '@mantine/core'
import dayjs from 'dayjs'
import "dayjs/locale/th"
import { IRecordChildParent } from '../interface/IRecord' // Fixed path (removed src/)
import { FaCheck } from "react-icons/fa6";
import { FaTimes } from "react-icons/fa";

function TableRecord({record=[], patient, hn, firstname, lastname}:
    {
        record: IRecordChildParent[],
        patient: string,
        hn: string,
        firstname: string,
        lastname: string,
    }
) { 
    const [title, setTitle] = React.useState<string>(patient)
    const recordCount = React.useRef<number>(0)
    const vectorCount = React.useRef<number>(0)

    React.useEffect(()=>{
        recordCount.current = 0
        vectorCount.current = 0
        setTitle(patient)
    },[record, patient, hn, firstname, lastname])

    const rows = record.map((data: IRecordChildParent, index: number) => {
        // --- CHILD TABLE LOGIC ---
        if (title === "child") {
            if (!data.child_hn) return null;
            recordCount.current = recordCount.current + 1
            vectorCount.current = data.child_vector ? vectorCount.current+1 : vectorCount.current
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
                    <Table.Td>{data.child_age_text}</Table.Td>
                    <Table.Td>{data.child_nationality}</Table.Td>
                    <Table.Td>{data.child_sex}</Table.Td>
                    <Table.Td>
                        {data.child_dob ? dayjs(data.child_dob).format("DD MMM YYYY") : "-"}
                    </Table.Td>
                    <Table.Td>{data.child_address}</Table.Td>
                    <Table.Td>{data.child_born_detail}</Table.Td>
                    <Table.Td>{data.child_born_weight}</Table.Td>
                    <Table.Td>{data.child_weight_now}</Table.Td>
                    <Table.Td>{data.child_height_length}</Table.Td>
                    <Table.Td>{data.child_integrity}</Table.Td>
                    <Table.Td>{data.child_data}</Table.Td>
                    <Table.Td bg={data.child_vector ? "green.1" : "red.1"}>
                        <Center>
                            {data.child_vector ? <FaCheck /> : <FaTimes />}
                        </Center>
                    </Table.Td>
                </Table.Tr>
            )
        } 
        
        // --- PARENT TABLE LOGIC ---
        else if (title === "parent") {
            if (!data.parent_hn) return null;
            recordCount.current = recordCount.current + 1
            vectorCount.current = data.parent_vector ? vectorCount.current+1 : vectorCount.current
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
                    <Table.Td>{data.parent_age_text}</Table.Td>
                    <Table.Td>{data.parent_nationality}</Table.Td>
                    <Table.Td>{data.parent_sex}</Table.Td>
                    <Table.Td>
                        {data.parent_dob ? dayjs(data.parent_dob).format("DD MMM YYYY") : "-"}
                    </Table.Td>
                    <Table.Td>{data.parent_address}</Table.Td>
                    <Table.Td>{data.parent_born_detail}</Table.Td>
                    <Table.Td>{data.parent_born_weight}</Table.Td>
                    <Table.Td>{data.parent_weight_now}</Table.Td>
                    <Table.Td>{data.parent_height_length}</Table.Td>
                    <Table.Td>{data.parent_integrity}</Table.Td>
                    <Table.Td>{data.parent_data}</Table.Td>
                    <Table.Td bg={data.parent_vector ? "green.1" : "red.1"}>
                        <Center>
                            {data.parent_vector ? <FaCheck /> : <FaTimes />}
                        </Center>
                    </Table.Td>
                </Table.Tr>
            )
        } 
        
        return null;
    })

    return (
        <Box 
            component='div'
            h={"80svh"}
            p={"sm"} 
            m={"xs"} 
            bd={"4px solid " + (patient === "child" ? "orange" : "green")} 
            bdrs={"sm"}
            style={{
                transition: "border-color 0.3s ease"
            }}
        >   
            <Group 
                align={"stretch"}
                justify={"space-between"}
            >
                <Title order={4}>{title === "child" ? "Child" : "Parent"}</Title>

                <Title order={5} display={"flex"} p={"sm"}>
                    found: {recordCount.current} record{recordCount.current > 1 && "s"}
                    <Space w={"xl"} />
                    checked vector: {vectorCount.current} record{vectorCount.current > 1 && "s"}
                </Title>
            </Group>

            <Table.ScrollContainer minWidth={"100%"} maxHeight={"60svh"}>
                <Table layout="auto" striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th bg={"gray.4"}><Center>HN</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>{title === "child" ? "HN-Parent" : "HN-Child"}</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>First Name</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Last Name</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Age</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Nationality</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Sex</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>DOB</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Address</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Born Detail</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Born Weight</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Now Weight</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Height</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Integrity</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Data</Center></Table.Th>
                            <Table.Th bg={"gray.4"}><Center>Vector</Center></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows}
                        {(!record || record.length === 0) && (
                            <Table.Tr>
                                <Table.Td colSpan={16} style={{textAlign: 'center', color: 'gray'}}>
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