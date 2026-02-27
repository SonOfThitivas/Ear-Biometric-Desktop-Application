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
} from '@mantine/core'
import { IRecordChildParent } from './interface/IRecord'
import TableRecord from './components/tableRecord'
import { notifications, Notifications } from '@mantine/notifications'
import { useDebouncedCallback } from '@mantine/hooks';
import PatientModeSelector from './components/patientMode'

// 1. IMPORT THE NEW API
import { webAPI } from './web-api';

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

    // Fetch all data automatically when page opens
    React.useEffect(() => {
        if (tab === "Record") fetchData("","","");
    }, [tab]);

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
    const handleShow = useDebouncedCallback(async (hn_para: string, firstname_para: string, lastname_para: string) => {
        const searchHn = hn_para !== undefined ? hn_para : hn;
        const searchFirst = firstname_para !== undefined ? firstname_para : firstname;
        const searchLast = lastname_para !== undefined ? lastname_para : lastname;
        await fetchData(searchHn, searchFirst, searchLast)
        setLoading(false)
    }, 500)

    // UPDATED: fetchData now accepts optional overrides
    const fetchData = async (overrideHn?: string, overrideFirst?: string, overrideLast?: string) => {
        // Determine values: use override if provided, otherwise use current state
        const searchHn = overrideHn
        const searchFirst = overrideFirst
        const searchLast = overrideLast

        try {
            console.log(`🚀 [UI] Searching Multi: HN="${searchHn}", First="${searchFirst}", Last="${searchLast}"`);
            
            // 2. USE WEB API
            const res = await webAPI.searchMultiCriteria(searchHn || '', searchFirst || '', searchLast || '');

            console.log(`✅ [UI] Found ${res.length} records`);
            console.log(res)

            if (res.length === 0){
                setRecord([]);
                // Optional: throw error or just show empty table
                // throw Error("No matched data. Please, try again!")
            } else {
                setRecord(res);
            }
            notifications.hide("error-record-id")

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
            })
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
                            handleShow(event.currentTarget.value, firstname, lastname)
                        }}
                    />

                    <TextInput
                        label="First Name"
                        placeholder="Enter your first name"
                        value={firstname}
                        onChange={(event)=>{
                            setLoading(true)
                            setFirstname(event.currentTarget.value)
                            handleShow(hn, event.currentTarget.value, lastname)
                        }}
                    />

                    <TextInput 
                        label="Last name"
                        placeholder="Enter your last name"
                        value={lastname}
                        onChange={(event)=>{
                            setLoading(true)
                            setLastname(event.currentTarget.value)
                            handleShow(hn, firstname, event.currentTarget.value)
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
                    </Group>
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