import React from 'react'
import { 
    Group,
    Title,
    Center,
    SegmentedControl,
} from '@mantine/core'
import { MdChildCare } from "react-icons/md";
import { IoIosPerson } from "react-icons/io";

export interface IPatientMode {
    patient: string
    setPatient: React.Dispatch<React.SetStateAction<string>>
}

function PatientModeSelector({patient, setPatient}:IPatientMode) {
  return (
    <Group justify='center'>
        <Title order={4}>
            Patient Mode
        </Title>
        <SegmentedControl
            value={patient}
            // defaultValue={patient}
            color={patient === "child" ? "orange" : "green"}
            onChange={setPatient}
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
    </Group>
  )
}

export default PatientModeSelector