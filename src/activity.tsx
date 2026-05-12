import React from 'react'
import { 
    LoadingOverlay,
    Stack,
    Title,
    Textarea,
    Text,
    Paper,
    Grid,
    Card,
    TextInput,
    Button,
    Group,
    Checkbox,
    SegmentedControl,
    Input,
    Center,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications, Notifications } from '@mantine/notifications'
import { IActivityCategory } from './interface/IActivityCategory'
import { TbSortAscendingNumbers, TbSortDescendingNumbers  } from "react-icons/tb";
import dayjs from 'dayjs'
import axios from 'axios';
import { api_url } from './interface/IApi';

function Activity(
    {tab}:
    {tab:string}) {

    const [data, setData] = React.useState<Array<{
                                                    activity: string;
                                                    time_stamp: string | Date;
                                                    firstname: string;
                                                    lastname: string;
                                                    username: string;
                                                }>>([])
    
    const [loading, setLoading] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string>("")

    const searchForm = useForm({
        mode: "uncontrolled",
        initialValues: {
            username: "",
            ordering: "DESC",
            category: [],
        },
    })
    
    const fetchData = async (
        username: string = "",
        ordering: string = "DESC",
        category: Array<string> = [],
    ) => {
        
        // payload to query
        const payload: IActivityCategory = {
            username: username.trim(),
            login: category.includes("login"),
            identify: category.includes("identify"),
            register: category.includes("register"),
            update: category.includes("update"),
            delete: category.includes("delete"),
            ordering: ordering,
        }
        
        // no username and checkbox item
        try {
            // fetching
            const response = await axios.get(`${api_url.database_api_url}/api/logs`, {
                params: { ordering: payload.ordering }
            });
            const res = response.data;

            // fail
            if (res.length === 0){
                throw Error("Fail to get data. Please, try again.")
            } else {
                // set json to array
                let data = res
                // filter category
                if (
                    payload.login ||
                    payload.register ||
                    payload.identify ||
                    payload.update ||
                    payload.delete
                ) {
                    data = data.filter((value)=>{
                        return (
                            (payload.login && value.activity.split(" ").includes("Logged")) ||
                            (payload.identify && value.activity.split(" ").includes("Identified")) ||
                            (payload.register && value.activity.split(" ").includes("Registered")) ||
                            (payload.update && value.activity.split(" ").includes("Updated")) ||
                            (payload.delete && value.activity.split(" ").includes("Deleted")) &&
                            {value}
                        ) || null
                    })
                }
                // username filter
                if (payload.username.length > 0){
                    data = data.filter((value)=>{
                        return (
                            payload.username.length > 0 &&
                            value.username.includes(payload.username) &&
                            {value}
                        ) || null
                    })
                }
                // set state
                setData(data)
                // if no data
                if (data.length === 0) {
                    throw Error("No matched data.")
                } 
            }
        } catch (err) {
            setError(err.message)
            // alert
            notifications.show({
                id: err.message,
                title: "Error!",
                message: err.message,
                color:"red",
                bg:"red.1",
                withBorder: true,
                autoClose: 4000,
                withCloseButton: true,
            })
        } finally {
            setLoading(false)
        }

    }

    // refresh
    const refresh = async () => {
        await fetchData()
    }

    // search
    const search = async () => {
        const values = searchForm.getValues()
        await fetchData(values.username, values.ordering, values.category)
    }

    // when toggle reset button
    const reset = async () => {
        // reset search
        searchForm.reset()

        notifications.show({
            id: "activity-reset",
            title: "Warning!",
            message: "This page was reset.",
            color:"yellow",
            bg:"yellow.1",
            withBorder: true,
            autoClose: 4000,
            withCloseButton: true,
        })
        await refresh()
    }

    // Fetch data at first time
    React.useEffect(()=>{
        if ( tab === "Activity") refresh()
    },[tab])

    return (
        <Stack
            justify='flex-start'
            align='center'
            gap={"md"}
            p={"md"}
            h={"90%"}
        >

            <Title order={1}>Activity</Title>
            
            <Grid w={"100%"}>
                
                <Grid.Col span={3}>

                    <Title order={2}>Search</Title>

                    <Card
                        bg={"green.3"}
                        shadow="md" 
                        padding="lg" 
                        radius="md" 
                        withBorder
                    >
                        
                        <Stack onChange={search} gap={"md"}>
                            <TextInput
                                label="Username"
                                size="md"
                                placeholder='Enter username'
                                key={searchForm.key("username")}
                                {...searchForm.getInputProps("username")}
                            />

                            <Input.Wrapper>
                            
                                <Input.Label>
                                    Order by
                                </Input.Label>

                                <SegmentedControl
                                    fullWidth
                                    withItemsBorders
                                    // orientation="vertical"
                                    key={searchForm.key("ordering")}
                                    color={"blue"}
                                    data={[
                                        {
                                            label: 
                                                <Center style={{ gap: 10 }}>
                                                    <TbSortDescendingNumbers size={16} />
                                                    <span>Descending</span>
                                                </Center>, 
                                            value: "DESC",},
                                        {
                                            label:  
                                                <Center style={{ gap: 10 }}>
                                                    <TbSortAscendingNumbers size={16} />
                                                    <span>Ascending</span>
                                                </Center>,
                                            value: "ASC",},
                                    ]}
                                    {...searchForm.getInputProps("ordering")}
                                />

                            </Input.Wrapper>

                            <Checkbox.Group
                                label="Category"
                                key={searchForm.key("category")}
                                {...searchForm.getInputProps("category")}
                            >

                                <Stack>

                                    <Checkbox 
                                        label="Login"
                                        value="login"
                                    />

                                    <Checkbox 
                                        label="Identify"
                                        value={"identify"}
                                    />

                                    <Checkbox 
                                        label="Register"
                                        value={"register"}
                                    />

                                    <Checkbox 
                                        label="Update"
                                        value={"update"}
                                    />

                                    <Checkbox 
                                        label="Delete"
                                        value={"delete"}
                                    />

                                </Stack>

                            </Checkbox.Group>

                            <Group grow>

                                {/* <Button 
                                    variant='filled'
                                    color={"blue"}
                                >
                                    Search
                                </Button> */}

                                <Button 
                                    variant='filled'
                                    color={"yellow"}
                                    onClick={reset}
                                >
                                    Reset
                                </Button>

                            </Group>

                        </Stack>

                    </Card>

                </Grid.Col>

                <Grid.Col span={9}>

                    <Paper
                        w={"100%"}
                        h={"100%"}
                        shadow="md"
                        withBorder
                        pos={"relative"}
                    >

                        <LoadingOverlay 
                            visible={loading} 
                            zIndex={1000} 
                            overlayProps={{ radius: "sm", blur: 2 }} 
                        />

                        <Textarea
                            size='xl'
                            w={"100%"}
                            h={"100%"}
                            autosize
                            maxRows={15}
                            readOnly
                            value={
                                data.map((item)=>{
                                    return (
                                        `${dayjs(item.time_stamp).format("ddd D MMM YYYY - HH:mm:ss")} - [${item.username}] ${item.activity}\n`
                                    )
                                }).join('')
                            }
                        />


                    </Paper>

                </Grid.Col>

            </Grid>

            <Notifications />

            <Text pos={"absolute"} bottom={0} w={"100%"}>{error}</Text>
        </Stack>
    )
}

export default Activity