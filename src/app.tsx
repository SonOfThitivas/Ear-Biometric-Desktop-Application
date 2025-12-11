import React from 'react';
import { createRoot } from 'react-dom/client';

import "@mantine/core/styles.css"
import '@mantine/dates/styles.css';
import "dayjs/locale/th"

import {
    MantineProvider, 
    AppShell, 
    NavLink,
    Tabs,
    Box,
    Flex
} from '@mantine/core';

import Identify from './identify';
import Record from './record';
import Login from './components/login';

const tabList = [
    {label: "Identify", child:<Identify/>},
    {label: "Registry", child:null},
    {label: "Update", child:null},
    {label: "Delete", child:null},
    {label: "Record", child:<Record/>},
]

const App = () => {
    const [active, setActive] = React.useState<string>("Identify");
    const [operatorNumber, setOperatorNumber] = React.useState<string>("")

    return (
        <MantineProvider>
            {operatorNumber === "" && <Login setOperatorNumberParent={setOperatorNumber}/>}
            {operatorNumber !== "" &&  
                <Box component='div'>
                    <Tabs defaultValue={active} variant="default" onChange={setActive}>
                        <Tabs.List justify='center' grow>
                            {
                            tabList.map((item, index) => (
                                <Tabs.Tab value={item.label} p={"lg"}>
                                    {item.label}
                                </Tabs.Tab>
                            ))
                            }
                        </Tabs.List>
                        {
                            tabList.map((item, index) => (
                                <Tabs.Panel 
                                    w={"100%"} 
                                    maw={"100%"} 
                                    // bd={"1px red solid"}
                                    value={item.label}
                                >
                                    {item.child}
                                </Tabs.Panel>
                            ))
                        }
                        
                    </Tabs>
                </Box>
            }

        </MantineProvider>
    )
}

const root = createRoot(document.getElementById("root"));
root.render(
    <App/>
);

