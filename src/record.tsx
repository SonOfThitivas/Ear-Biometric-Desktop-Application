import React from 'react'
import { 
    Box, 
    TextInput, 
    Title, 
    Grid,
    Button,
    Group,
    Alert,
    Transition,
} from '@mantine/core'
import { IRecordChildParent } from './interface/IRecord'
import TableRecord from './components/tableRecord'
import { TbAlertCircle } from "react-icons/tb"

function Record({
    tab="Record"
}:{
    tab?:string
}) {

    const [record, setRecord] = React.useState<IRecordChildParent[]>([])   // fetch data
    const [hn, setHn] = React.useState<string>("")  // hospital number fill
    const [firstname, setFirstname] = React.useState<string>("")  // firstname fill
    const [lastname, setLastname] = React.useState<string>("")   // lastname fill

    const tbAlertCircle = <TbAlertCircle/>
    const [alertError, setAlertError] = React.useState<boolean>(false)  // alert error
    const [errorMessage, setErrorMessage] = React.useState<string>("")  // error message
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click
    
    // Fetch all data automatically when page opens
    React.useEffect(() => {
        if (tab === "Record") fetchData();
    }, [tab]);

    // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout((e)=>{
            setErrorMessage("")
            setAlertError(false)
            clearTimeout(timeout)
        }, 5000)
    }

    // handle when click reset
    const handleReset = () => {
        // 1. Clear the inputs visually
        setHn("")
        setFirstname("")
        setLastname("")
        
        // 2. Fetch ALL data immediately (passing empty strings explicitly)
        // We pass "" to override the state which might not have updated yet
        fetchData("", "", ""); 
    }

    // handle when click show
    const handleShow = async () => {
        setLoading(true)
        await fetchData()
    }

    // UPDATED: fetchData now accepts optional overrides
    const fetchData = async (overrideHn?: string, overrideFirst?: string, overrideLast?: string) => {
        // Determine values: use override if provided, otherwise use current state
        const searchHn = overrideHn !== undefined ? overrideHn : hn;
        const searchFirst = overrideFirst !== undefined ? overrideFirst : firstname;
        const searchLast = overrideLast !== undefined ? overrideLast : lastname;

        try {
            console.log(`🚀 [UI] Searching Multi: HN="${searchHn}", First="${searchFirst}", Last="${searchLast}"`);
            
            // Call API with the determined values
            const res = await window.electronAPI.searchMultiCriteria(searchHn, searchFirst, searchLast);

            console.log(`✅ [UI] Found ${res.length} records`);

            if (res.length === 0){
                setAlertError(true);
                setErrorMessage("No matched data.");
                setRecord([]);
            } else {
                setRecord(res);
            }
            setLoading(false);

        } catch (err){
            console.error("❌ [UI] Search Failed:", err);
            setAlertError(true);
            setErrorMessage("Cannot get the data. Please, try again.");
            setLoading(false);
        }
    }


    return (
        <Box component='div' p={"md"} maw={"100%"}>

            {/* Section Filter */}
            <Box component='div' p={"sm"} m={"xs"} bd={"2px black solid"} bdrs={"sm"}>
                <Title order={4}>Filter</Title>
                <Grid
                    h="100%"
                    p="md"
                    justify='center'
                    align='end'
                >
                    <Grid.Col span={4}>
                        <TextInput
                            label="Hospital Number"
                            placeholder="Enter your hospital number"
                            value={hn}
                            onChange={(event)=>setHn(event.currentTarget.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <TextInput
                            label="First Name"
                            placeholder="Enter your first name"
                            value={firstname}
                            onChange={(event)=>setFirstname(event.currentTarget.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <TextInput 
                            label="Last name"
                            placeholder="Enter your last name"
                            value={lastname}
                            onChange={(event)=>setLastname(event.currentTarget.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Group grow w={"100%"}>
                            <Button
                                variant='filled'
                                color='yellow'
                                onClick={handleReset}
                            >
                                Reset
                            </Button>
                            <Button 
                                variant='filled' 
                                color='green'
                                onClick={handleShow}
                                loading={loading}
                            >Show</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Box>

            {/* child parent */}
            <TableRecord title="child" record={record}/>

            {/* parent table */}
            <TableRecord title="parent" record={record}/>

            {/* alert when error */}
            <Transition
                mounted={alertError}
                transition="fade-left"
                duration={400}
                timingFunction="ease"
                keepMounted
                onEntered={handleTransition}
            >
                {(styles) => 
                <Alert
                    pos={"fixed"}
                    w={"25%"}
                    right={"1rem"}
                    bottom={"1rem"}
                    variant="filled" 
                    color="red" 
                    title="Error"
                    icon={tbAlertCircle}
                    onClose={()=>setAlertError(false)}
                    withCloseButton
                    style={styles}
                >
                    {errorMessage}
                </Alert>}
            </Transition>
        </Box>
    )
}

export default Record