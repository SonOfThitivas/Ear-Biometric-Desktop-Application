import React from 'react'
import { notifications, Notifications } from '@mantine/notifications';
import { handleCount } from './voicePlayer';

interface ICaptureNoti {
    isCapture: boolean
    insideZone: boolean
    countdown: number
    setBgcolor: React.Dispatch<React.SetStateAction<string>>
    load: Function
}

function CaptureNoti({isCapture, insideZone, countdown, setBgcolor, load}:ICaptureNoti) {

    React.useEffect(()=>{
        if (!isCapture) {
            // set background color white
            setBgcolor("white")
            // hide alert
            notifications.hide("noti-countdown")
        } else {
            // show alert
            notifications.show({
                id: "noti-countdown",
                color:"yellow",
                loading: true,
                title: "Capturing...",
                message: `Capture in ${countdown} seconds`,
                autoClose: false,
                withCloseButton: false,
            })

            if (insideZone) {
                // ear inside zone
                setBgcolor("green.4")
                // play voice countdown
                handleCount(load, countdown)
                
            } else {
                // ear outside zone
                setBgcolor("red.4")
            }
        }
    }, [insideZone, isCapture, countdown])

    return (
        <div>
            <Notifications/>
        </div>
    )
}

export default CaptureNoti