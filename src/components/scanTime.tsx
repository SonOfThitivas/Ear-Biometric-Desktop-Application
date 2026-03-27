import React from 'react'
import { Table, Text } from '@mantine/core';
import dayjs from 'dayjs'

interface IScanTime {
    isCapturing: boolean
    startTime: Date | null
    setStartTime: React.Dispatch<React.SetStateAction<Date | null>>
}

function ScanTime({isCapturing, startTime, setStartTime}:IScanTime) {

    const [elapsedMilliseconds, setElapsedMilliseconds] = React.useState(0)

    // Handle capturing state changes
    React.useEffect(() => {
        if (isCapturing) {
            // Start capturing - record start time
            setStartTime(dayjs().toDate())
            setElapsedMilliseconds(0)
        }
    }, [isCapturing, setStartTime])

    // Update elapsed time every 10ms when capturing (for millisecond precision)
    React.useEffect(() => {
        if (!startTime) setElapsedMilliseconds(0)
        if (!isCapturing || !startTime) return

        const interval = setInterval(() => {
            const now = dayjs()
            const start = dayjs(startTime)
            const milliseconds = now.diff(start, 'millisecond')
            setElapsedMilliseconds(milliseconds)
        }, 10)

        return () => clearInterval(interval)
    }, [isCapturing, startTime])

    // Extract time components
    const getTimeComponents = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        const ms = milliseconds % 1000

        return { hours, minutes, secs, ms }
    }

    // Format individual time components
    const formatHours = (milliseconds: number) => String(getTimeComponents(milliseconds).hours).padStart(2, '0')
    const formatMinutes = (milliseconds: number) => String(getTimeComponents(milliseconds).minutes).padStart(2, '0')
    const formatSeconds = (milliseconds: number) => String(getTimeComponents(milliseconds).secs).padStart(2, '0')
    const formatMilliseconds = (milliseconds: number) => String(getTimeComponents(milliseconds).ms).padStart(3, '0')

  return (
    <div>
        <Table variant="horizontal" layout="auto" withTableBorder withColumnBorders>
            <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#d0d0d0' }}>
                    <Table.Th style={{ textAlign: 'center' }}>Hour</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Minute</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Seconds</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Millisecond</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                <Table.Tr style={{ backgroundColor: '#ffffff' }}>
                    <Table.Td style={{ textAlign: 'center', color: '#000000' }}>{formatHours(elapsedMilliseconds)}</Table.Td>
                    <Table.Td style={{ textAlign: 'center', color: '#000000' }}>{formatMinutes(elapsedMilliseconds)}</Table.Td>
                    <Table.Td style={{ textAlign: 'center', color: '#000000' }}>{formatSeconds(elapsedMilliseconds)}</Table.Td>
                    <Table.Td style={{ textAlign: 'center', color: '#000000' }}>{formatMilliseconds(elapsedMilliseconds)}</Table.Td>
                </Table.Tr>
            </Table.Tbody>
        </Table>
    </div>
  )
}

export default ScanTime