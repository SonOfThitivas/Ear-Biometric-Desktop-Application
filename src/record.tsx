import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Title, 
    Grid, 
    Button, 
    Group, 
    Radio, 
    Input, 
    NumberInput, 
    Table
} from '@mantine/core';
import { 
    DateInput, 
    DatesProvider
} from '@mantine/dates';
import dayjs from 'dayjs';

interface RelationRow {
    relation_id: number | null;
    child_hn: string;
    parent_hn: string;
    child_firstname: string;
    child_lastname: string;
    child_age: number;
    child_sex: string;
    child_dob: string;
    parent_firstname: string;
    parent_lastname: string;
    parent_age: number;
    parent_sex: string;
    parent_dob: string;
}

interface Patient {
    hn: string;
    firstname: string;
    lastname: string;
    age: number;
    sex: string;
    dob: string;
}

function Record() {
    const [searchHN, setSearchHN] = useState('');
    const [searchName, setSearchName] = useState('');
    
    const [relationsData, setRelationsData] = useState<RelationRow[]>([]);
    const [patientsData, setPatientsData] = useState<Patient[]>([]);

    // 1. INITIAL LOAD: Fetch Patients AND Relations
    useEffect(() => {
        const initData = async () => {
            console.log("🚀 [UI] Initializing data..."); 
            try {
                // Fetch Patients
                const allPatients = await window.electronAPI.getAllPatients();
                setPatientsData(allPatients);
                console.log(`✅ [UI] Loaded ${allPatients.length} patients`);

                // Fetch Relations
                const allRelations = await window.electronAPI.getAllRelations();
                setRelationsData(allRelations);
                console.log(`✅ [UI] Loaded ${allRelations.length} relations`);

            } catch (error) {
                console.error("❌ [UI] Error loading initial data:", error);
            }
        };

        initData();
    }, []);

    const handleShow = async () => {
        console.log("🖱️ [UI] Show button clicked");
        let results: RelationRow[] = [];

        try {
            if (searchHN) {
                results = await window.electronAPI.getByHN(searchHN);
            } else if (searchName) {
                results = await window.electronAPI.getByName(searchName);
            } else {
                alert("Please enter a Hospital Number or Firstname");
                return;
            }

            if (results.length === 0) {
                alert("No results found in database");
            }

            setRelationsData(results);
            processPatientsFromRelations(results);

        } catch (error) {
            console.error("❌ [UI] Error fetching data:", error);
            alert("Error fetching data.");
        }
    };

    const handleReset = async () => {
        console.log("🔄 [UI] Resetting to full view");
        setSearchHN('');
        setSearchName('');
        
        // Reload ALL data on reset
        try {
            const allPatients = await window.electronAPI.getAllPatients();
            setPatientsData(allPatients);

            const allRelations = await window.electronAPI.getAllRelations();
            setRelationsData(allRelations);
        } catch (error) {
            console.error("❌ [UI] Error resetting data:", error);
        }
    };

    const processPatientsFromRelations = (rows: RelationRow[]) => {
        const uniquePatients = new Map<string, Patient>();
        rows.forEach(row => {
            if (row.child_hn && !uniquePatients.has(row.child_hn)) {
                uniquePatients.set(row.child_hn, {
                    hn: row.child_hn,
                    firstname: row.child_firstname,
                    lastname: row.child_lastname,
                    age: row.child_age,
                    sex: row.child_sex,
                    dob: row.child_dob
                });
            }
            if (row.parent_hn && !uniquePatients.has(row.parent_hn)) {
                uniquePatients.set(row.parent_hn, {
                    hn: row.parent_hn,
                    firstname: row.parent_firstname,
                    lastname: row.parent_lastname,
                    age: row.parent_age,
                    sex: row.parent_sex,
                    dob: row.parent_dob
                });
            }
        });
        setPatientsData(Array.from(uniquePatients.values()));
    };

    // --- Render Rows ---
    const patientRows = patientsData.map((patient, index) => (
        <Table.Tr key={`${patient.hn}-${index}`}>
            <Table.Td>{patient.hn}</Table.Td>
            <Table.Td>{patient.firstname}</Table.Td>
            <Table.Td>{patient.lastname}</Table.Td>
            <Table.Td>{patient.age}</Table.Td>
            <Table.Td>{patient.sex}</Table.Td>
            <Table.Td>{patient.dob ? dayjs(patient.dob).format('DD/MM/YYYY') : ''}</Table.Td>
        </Table.Tr>
    ));

    // Filter out null relations (ghosts)
    const validRelations = relationsData.filter(r => r.relation_id !== null);
    
    const relationRows = validRelations.map((rel, index) => (
        <Table.Tr key={`${rel.relation_id}-${index}`}>
            <Table.Td>{rel.relation_id}</Table.Td>
            <Table.Td>{rel.child_hn}</Table.Td>
            <Table.Td>{rel.parent_hn}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Box component='div' p={"sm"}>
            {/* Section Filter */}
            <Box component='div' p={"sm"} m={"xs"} bd={"2px black solid"} bdrs={"sm"}>
                <Title order={4}>Filter</Title>
                <Grid h="100%" p="md" align='end'>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Hospital Number">
                            <Input placeholder="Enter hospital number" value={searchHN} onChange={(e) => setSearchHN(e.target.value)} />
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Firstname">
                            <Input placeholder="Enter firstname" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}><Input.Wrapper label="Lastname"><Input placeholder="Enter lastname" disabled/></Input.Wrapper></Grid.Col>
                    <Grid.Col span={4}><NumberInput label="Age" placeholder="Enter age" disabled /></Grid.Col>
                    <Grid.Col span={4}><DatesProvider settings={{locale:"th"}}><DateInput valueFormat='DD/MM/YYYY' label="Date of Birth" placeholder="DD/MM/YYYY" disabled /></DatesProvider></Grid.Col>
                    <Grid.Col span={4}><Radio.Group label="Sex"><Group mt="xs"><Radio value="M" label="Male" disabled /><Radio value="F" label="Female" disabled /></Group></Radio.Group></Grid.Col>
                    <Grid.Col span={4}><Input.Wrapper label="Relation ID"><Input placeholder="Enter relation id" disabled /></Input.Wrapper></Grid.Col>
                    <Grid.Col span={4}>
                        <Group grow justify="space-between">
                            <Button variant='filled' color='yellow' onClick={handleReset}>Reset</Button>
                            <Button variant='filled' color='green' onClick={handleShow}>Show</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Box>

            {/* Patients Table */}
            <Box component='div' p={"sm"} m={"xs"} bd={"2px black solid"} bdrs={"sm"} h={"25svh"} style={{ display: 'flex', flexDirection: 'column' }}>
                <Title order={4} mb="xs">patients</Title>
                <Table.ScrollContainer minWidth={"100%"} type="native" style={{ flex: 1, overflowY: 'auto' }}>
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
                            {patientsData.length > 0 ? patientRows : (
                                <Table.Tr><Table.Td colSpan={6} style={{ textAlign: 'center' }}>No patients found</Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>

            {/* Patient Relations Table */}
            <Box component='div' p={"sm"} m={"xs"} bd={"2px black solid"} bdrs={"sm"} h={"25svh"} style={{ display: 'flex', flexDirection: 'column' }}>
                <Title order={4} mb="xs">patient_relations</Title>
                <Table.ScrollContainer minWidth={"100%"} type="native" style={{ flex: 1, overflowY: 'auto' }}>
                    <Table stickyHeader withTableBorder layout="fixed">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>relation_id</Table.Th>
                                <Table.Th>child_hn</Table.Th>
                                <Table.Th>parent_hn</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {validRelations.length > 0 ? relationRows : (
                                <Table.Tr><Table.Td colSpan={3} style={{ textAlign: 'center' }}>No relations found</Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>
        </Box>
    )
}

export default Record;