import React from 'react'
import { 
    Box,
    Stack, 
    TextInput, 
    Title, 
    Grid,
    Button,
    Group,
    LoadingOverlay,
    Checkbox,
    Radio
} from '@mantine/core'
import { IRecordChildParent } from './interface/IRecord'
import TableRecord from './components/tableRecord'
import { notifications, Notifications } from '@mantine/notifications'
import { useDebouncedCallback } from '@mantine/hooks';
import PatientModeSelector from './components/patientMode'

function Record({
    tab="Record"
}:{
    tab?:string
}) {

    const [record, setRecord] = React.useState<IRecordChildParent[]>([])   // fetch data
    const [hn, setHn] = React.useState<string>("")  // hospital number fill
    const [firstname, setFirstname] = React.useState<string>("")  // firstname fill
    const [lastname, setLastname] = React.useState<string>("")   // lastname fill
    const [patient, setPatient] = React.useState<string>("child")   // patient mode
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click
    const [sexFilter, setSexFilter] = React.useState<string[]>([])
    const [nationFilter, setNationFilter] = React.useState<string[]>([])
    const [sortBy, setSortBy] = React.useState<string>("child_fname")

    // Fetch all data automatically when page opens
    React.useEffect(() => {
        if (tab === "Record") fetchData("","","");
    }, [tab]);

    React.useEffect(() => {
        // If it currently ends with "_fname", keep it "_fname" but swap the prefix
        if (sortBy.includes('_fname')) setSortBy(`${patient}_fname`);
        else if (sortBy.includes('_lname')) setSortBy(`${patient}_lname`);
        else if (sortBy.includes('_age')) setSortBy(`${patient}_age`);
        else setSortBy(`${patient}_fname`); // Default fallback
    }, [patient]);

    // handle when click reset
    const handleReset = () => {
        // 1. Clear the inputs visually
        setHn("")
        setFirstname("")
        setLastname("")
        
        // 2. Fetch ALL data immediately (passing empty strings explicitly)
        // We pass "" to override the state which might not have updated yet
        fetchData("", "", ""); 

        notifications.show({
            id: "reset-record-id",
            title: "Reset!",
            message: "The record has been reset!",
            color:"yellow",
            bg:"yellow.1",
            autoClose: 4000,
            withCloseButton: true,
            withBorder:true,
        })
    }

    // handle when click show
    const handleShow = useDebouncedCallback(async (hn_para: string, firstname_para: string, lastname_para: string,sex_para: string[], 
        nation_para: string[], sort_para: string) => {
        const searchHn = hn_para !== undefined ? hn_para : hn;
        const searchFirst = firstname_para !== undefined ? firstname_para : firstname;
        const searchLast = lastname_para !== undefined ? lastname_para : lastname;
        await fetchData(hn_para, firstname_para, lastname_para, sex_para, nation_para, sort_para)
        setLoading(false)
    }, 500)

    // UPDATED: fetchData now accepts optional overrides
    const fetchData = async (
        overrideHn?: string, 
        overrideFirst?: string, 
        overrideLast?: string, 
        overrideSex?: string[], 
        overrideNationality?: string[],
        overrideSortBy?: string, 
        overrideSortDir?: string
    ) => {
        // 1. Determine values: use override if provided, otherwise fallback to current state
        const searchHn = overrideHn !== undefined ? overrideHn : hn;
        const searchFirst = overrideFirst !== undefined ? overrideFirst : firstname;
        const searchLast = overrideLast !== undefined ? overrideLast : lastname;
        
        const activeSexFilter = overrideSex !== undefined ? overrideSex : sexFilter;
        const activeNationFilter = overrideNationality !== undefined ? overrideNationality : nationFilter;
        const activeSortBy = overrideSortBy !== undefined ? overrideSortBy : sortBy;
        const activeSortDir = overrideSortDir !== undefined ? overrideSortDir : 'ASC';

        // 2. Format filters for the database (If both or neither are checked, send "" to fetch all)
        const dbSex = activeSexFilter.length === 1 ? activeSexFilter[0] : "";
        const dbNation = activeNationFilter.length === 1 ? activeNationFilter[0] : "";

        try {
            console.log(`🚀 [UI] Searching Multi: HN="${searchHn}", First="${searchFirst}", Sex="${dbSex}", Nation="${dbNation}", Sort="${activeSortBy}"`);
            
            // 3. Call API with ALL the determined values
            const res = await window.electronAPI.searchMultiCriteria(
                searchHn, 
                searchFirst, 
                searchLast,
                dbSex,
                dbNation,
                activeSortBy,
                activeSortDir
            );

            console.log(`✅ [UI] Found ${res.length} records`);
            console.log(res);

            if (res.length === 0){
                setRecord([]);
                throw Error("No matched data. Please, try again!")
            } else {
                setRecord(res);
            }
            notifications.hide("error-record-id");

        } catch (err: any){
            console.error("❌ [UI] Search Failed:", err.message);
            setLoading(false);
            notifications.show({
                id: "error-record-id",
                title: "Error!",
                message: err.message,
                color:"red",
                bg:"red.1",
                withBorder: true,
                autoClose: 4000,
                withCloseButton: true,
            });
        }
    }

    return (
        <Grid component='div' p={"md"} maw={"100%"}>
            {/* Section Filter */}
            <Grid.Col span={2}>
                <Stack
                    bg="yellow.1"
                    align="stretch"
                    justify="center"
                    bd={"3 black solid"}
                    bdrs={"sm"}
                    p={"lg"}
                >
                    <Title order={4}>
                        Search
                    </Title>
                    
                    <PatientModeSelector title={""}  patient={patient} setPatient={setPatient}/>

                    <TextInput
                        label="Hospital Number"
                        placeholder="Enter your hospital number"
                        value={hn}
                        onChange={(event)=>{
                            setLoading(true)
                            setHn(event.currentTarget.value)
                            handleShow(event.currentTarget.value, firstname, lastname, sexFilter, nationFilter, sortBy)
                        }}
                    />

                    <TextInput
                        label="First Name"
                        placeholder="Enter your first name"
                        value={firstname}
                        onChange={(event)=>{
                            setLoading(true)
                            setFirstname(event.currentTarget.value)
                            handleShow(hn, event.currentTarget.value, lastname, sexFilter, nationFilter, sortBy)
                        }}
                    />

                    <TextInput 
                        label="Last name"
                        placeholder="Enter your last name"
                        value={lastname}
                        onChange={(event)=>{
                            setLoading(true)
                            setLastname(event.currentTarget.value)
                            handleShow(hn, firstname, event.currentTarget.value, sexFilter, nationFilter, sortBy)
                        }}
                    />

                    <Group grow w={"100%"}>
                        <Button
                            variant='filled'
                            color='yellow'
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                        {/* <Button 
                            variant='filled' 
                            color='green'
                            onClick={handleShow}
                            loading={loading}
                        >
                            Show
                        </Button> */}
                    </Group>
                    <Checkbox.Group 
                        label="Nationality" 
                        value={nationFilter} 
                        onChange={(val) => {
                            setLoading(true); setNationFilter(val);
                            handleShow(hn, firstname, lastname, sexFilter, val, sortBy);
                        }}
                    >
                        <Stack mt="xs" gap="xs">
                            <Checkbox label="Myanmar" value="myanmar" />
                            <Checkbox label="Thai" value="thai" />
                        </Stack>
                    </Checkbox.Group>

                    {/* Sex Filter */}
                    <Checkbox.Group 
                        label="Sex" 
                        value={sexFilter} 
                        onChange={(val) => {
                            setLoading(true); setSexFilter(val);
                            handleShow(hn, firstname, lastname, val, nationFilter, sortBy);
                        }}
                    >
                        <Stack mt="xs" gap="xs">
                            <Checkbox label="Male" value="M" />
                            <Checkbox label="Female" value="F" />
                        </Stack>
                    </Checkbox.Group>

                    {/* Sorting Radio */}
                    <Title order={5} mt="sm">Sort By</Title>
                    <Radio.Group 
                        value={sortBy} 
                        onChange={(val) => {
                            setLoading(true); setSortBy(val);
                            handleShow(hn, firstname, lastname, sexFilter, nationFilter, val);
                        }}
                    >
                        <Stack mt="xs" gap="xs">
                            <Radio label="First Name" value={`${patient}_fname`} />
                            <Radio label="Last Name" value={`${patient}_lname`} />
                            <Radio label="Date of Birth" value={`${patient}_age`} />
                        </Stack>
                    </Radio.Group>
                </Stack>
            </Grid.Col>

            <Grid.Col span={10} pos={"relative"}>
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                {/* child parent */}
                <TableRecord patient={patient} record={record} hn={hn} firstname={firstname} lastname={lastname}/>

            </Grid.Col>


            {/* alert when error */}
            <Notifications/>
        </Grid>
    )
}

export default Record