import React from 'react'
import { notifications, Notifications } from '@mantine/notifications';

interface ICaptureNoti {
    isCapture: boolean
    insideZone: boolean
    countdown: number
    setBgcolor: React.Dispatch<React.SetStateAction<string>>
}

function CaptureNoti({isCapture, insideZone, countdown, setBgcolor}:ICaptureNoti) {


    React.useEffect(()=>{
        if (!isCapture) {
            setBgcolor("white")
            notifications.hide("noti-countdown")
        } else {
            notifications.show({
                id: "noti-countdown",
                color:"yellow",
                loading: true,
                title: "Capturing...",
                message: `Capture in ${countdown} seconds`,
                autoClose: false,
                withCloseButton: false,
            })
            if (insideZone) setBgcolor("green.4")
            else setBgcolor("red.4")
        }
    }, [insideZone, isCapture])

    React.useEffect(()=>{
        notifications.update({
            id: "noti-countdown",
            loading: true,
            title: "Capturing...",
            message: `Capture in ${countdown} seconds`,
            autoClose: false,
            withCloseButton: false,
        })
    },[countdown])

    return (
        <div>
            <Notifications/>
        </div>
    )
}

export default CaptureNoti