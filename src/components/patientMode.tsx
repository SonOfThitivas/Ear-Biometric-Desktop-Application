import React from 'react'
import { 
    Grid,
    Title,
    Center,
    SegmentedControl,
} from '@mantine/core'
import { MdChildCare } from "react-icons/md";
import { IoIosPerson } from "react-icons/io";

export interface IPatientMode {
    title?: string
    patient: string
    setPatient: React.Dispatch<React.SetStateAction<string>>
}

function PatientModeSelector({title="Patient Mode", patient, setPatient,}:IPatientMode) {

    const handleOnChange = (value:string) => {
        // set mode
        setPatient(value)
    }

    return (
        <Grid justify="center">
            {title && 
                <Grid.Col span={"content"}>
                    <Title order={4} textWrap='nowrap' >
                        {title}
                    </Title>
                </Grid.Col>
            }
            <Grid.Col span={"auto"}>
                <SegmentedControl
                    fullWidth
                    value={patient}
                    withItemsBorders
                    // defaultValue={patient}
                    color={patient === "child" ? "orange" : "green"}
                    onChange={handleOnChange}
                    data={[
                        {
                            value:"child",
                            label:(
                            <Center style={{ gap: 10 }}>
                                <MdChildCare size={16} />
                                <span>Child</span>
                            </Center>
                            ),
                        },
                        {
                            value:"parent",
                            label:(
                            <Center style={{ gap: 10 }}>
                                <IoIosPerson size={16} />
                                <span>Parent</span>
                            </Center>
                            ),
                        }

                    ]}
                />
            </Grid.Col>
        </Grid>
    )
}

export default PatientModeSelector