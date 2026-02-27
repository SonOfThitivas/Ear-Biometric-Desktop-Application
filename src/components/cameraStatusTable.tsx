import React from 'react';
import { Table, Text } from '@mantine/core';

interface StatusTableProps {
    isCapturing: boolean;
    cameraData: any; // You can replace 'any' with your specific interface if available
    patientMode: string;
}
// interface distance range
import { 
    IDistanceRange,
    childDistanceRange,
    parentDistanceRange,
} from "../interface/IDistanceRange";

export default function CameraStatusTable({ isCapturing, cameraData, patientMode="child" }: StatusTableProps) {

    const maxDist = React.useRef<number>(patientMode === "child" ? childDistanceRange.max : parentDistanceRange.max)
    const minDist = React.useRef<number>(patientMode === "child" ? childDistanceRange.min : parentDistanceRange.min)

    React.useEffect(()=>{
        if (patientMode === "child") {
            maxDist.current = childDistanceRange.max
            minDist.current = childDistanceRange.min
        } else {
            maxDist.current = parentDistanceRange.max
            minDist.current = parentDistanceRange.min
        }
    },[patientMode])

    // Helper: Calculate Distance Status
    const getDistanceStatus = () => {
        if (!isCapturing) return { bg: 'white', content: <Text c="dimmed">-</Text> };
        
        const dist = cameraData?.distance;
        if (dist === undefined || dist === null) return { bg: 'white', content: <Text c="dimmed">...</Text> };

        // Valid range: 0.25 - 0.30
        if (dist >= minDist.current && dist <= maxDist.current) {
            return { bg: 'green.5', content: <Text fw={700}>Okay</Text> };
        } else if (dist > maxDist.current) {
            const diff = ((dist - 0.3) * 100).toFixed(2); // Convert to cm
            return { bg: 'red.5', content: <Text fw={700}>-{diff} cm.</Text> };
        } else {
            const diff = ((minDist.current - dist) * 100).toFixed(2); // Convert to cm
            return { bg: 'red.5', content: <Text fw={700}>+{diff} cm.</Text> };
        }
    };

    // Helper: Calculate Horizontal Status
    const getHorizontalStatus = () => {
        if (!isCapturing) return { bg: 'white', content: <Text c="dimmed">-</Text> };

        if (cameraData?.horiz_status === true) {
            return { bg: 'green.5', content: <Text fw={700}>Okay</Text> };
        }
        return { bg: 'orange.5', content: <Text fw={700}>{cameraData?.horiz_msg || "Adjust"}</Text> };
    };

    // Helper: Calculate Vertical Status
    const getVerticalStatus = () => {
        if (!isCapturing) return { bg: 'white', content: <Text c="dimmed">-</Text> };

        if (cameraData?.vert_status === true) {
            return { bg: 'green.5', content: <Text fw={700}>Okay</Text> };
        }
        return { bg: 'orange.5', content: <Text fw={700}>{cameraData?.vert_msg || "Adjust"}</Text> };
    };

    const distRes = getDistanceStatus();
    const horiRes = getHorizontalStatus();
    const vertRes = getVerticalStatus();

    return (
        <Table variant="vertical" layout="auto" withTableBorder>
            <Table.Tbody>
                {/* ROW 1: DISTANCE */}
                <Table.Tr>
                    <Table.Th>Distance</Table.Th>
                    <Table.Td bg={distRes.bg} w={155}>
                        {distRes.content}
                    </Table.Td>
                </Table.Tr>

                {/* ROW 2: HORIZONTAL */}
                <Table.Tr>
                    <Table.Th>Horizontal</Table.Th>
                    <Table.Td bg={horiRes.bg}>
                        {horiRes.content}
                    </Table.Td>
                </Table.Tr>

                {/* ROW 3: VERTICAL */}
                <Table.Tr>
                    <Table.Th>Vertical</Table.Th>
                    <Table.Td bg={vertRes.bg}>
                        {vertRes.content}
                    </Table.Td>
                </Table.Tr>
            </Table.Tbody>
        </Table>
    );
}