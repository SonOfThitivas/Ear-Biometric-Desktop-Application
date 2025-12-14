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
import Login from './components/login';
import Record from './record';
import Delete from './delete';
import Update from './update'
import Registry from './registry';

const App = () => {
    const [active, setActive] = React.useState<string | null>("Identify");
    const [operatorNumber, setOperatorNumber] = React.useState<string>("")
    
    // 1. Add Role State
    const [role, setRole] = React.useState<string>("")


    // 2. Move tabList inside to access 'role'
    const tabList = [
        {label: "Identify", child:<Identify/>},
        {label: "Registry", child:null},
        {label: "Update", child:<Update/>},
        {label: "Delete", child:<Delete role={role}/>}, 
        {label: "Record", child:<Record/>},
    ]

    return (
        <MantineProvider>
            {/* 4. Pass setRoleParent to Login */}
            {operatorNumber === "" && (
                <Login 
                    setOperatorNumberParent={setOperatorNumber} 
                    setRoleParent={setRole}
                />
            )}

            {operatorNumber !== "" &&  
                <Box component='div'>
                    <Tabs defaultValue="Identify" variant="default" value={active} onChange={setActive}>
                        <Tabs.List justify='center' grow>
                            {
                            tabList.map((item, index) => (
                                <Tabs.Tab key={item.label} value={item.label} p={"lg"}>
                                    {item.label}
                                </Tabs.Tab>
                            ))
                            }
                        </Tabs.List>
                        {
                            tabList.map((item, index) => (
                                <Tabs.Panel 
                                    key={item.label}
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

const root = createRoot(document.getElementById("root")!);
root.render(
    <App/>
);
