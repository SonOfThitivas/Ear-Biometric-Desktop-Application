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
import Registry from './registry';

// const navbarList = [
//     {label: "Identify"},
//     {label: "Registry"},
//     {label: "Update"},
//     {label: "Delete"},
//     {label: "Record"},
// ]

const tabList = [
    {label: "Identify", child:<Identify/>},
    {label: "Registry", child:<Registry/>},
    {label: "Update", child:null},
    {label: "Delete", child:null},
    {label: "Record", child:<Record/>},
]

const App = () => {
    const [active, setActive] = React.useState<string>("Identify");

    // const navbarItems = navbarList.map((item, index) => (
    // <NavLink
    // key={item.label}
    // active={index === active}
    // label={item.label}
    // onClick={() => setActive(index)}
    // //   href="#required-for-focus"
    // //   description={item.description}
    // //   rightSection={item.rightSection}
    // //   leftSection={<item.icon size={16} stroke={1.5} />}

    // />))

    return (
        <MantineProvider>

            {/* <AppShell
            // padding="md"
            // header={{ height: "100"}} 
            navbar={{width:200, breakpoint:null}}
            >
                <AppShell.Navbar>
                    {navbarItems}
                </AppShell.Navbar>

                <AppShell.Main>
                    {active === 0 && <Identify/>}
                    {active === 4 && <Record/>}
                </AppShell.Main>

            </AppShell> */}

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

        </MantineProvider>
    )
}

const root = createRoot(document.getElementById("root"));
root.render(
    <App/>
);

