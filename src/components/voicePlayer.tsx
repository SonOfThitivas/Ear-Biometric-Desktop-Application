import Start_Detection from "../assets/Start Detection.mp3"
import Detection_finishes from "../assets/Detection finishes.mp3"
import Start_Capture from "../assets/Start Capture.mp3"
import Capturing_Finishes from "../assets/Capturing Finishes.mp3"
import First_Capture from "../assets/First Capture.mp3"
import Second_Capture from "../assets/Second Capture.mp3"
import Third_Capture from "../assets/Third Capture.mp3"
import one from "../assets/one.mp3"
import two from "../assets/two.mp3"
import three from "../assets/three.mp3"
import four from "../assets/four.mp3"
import five from "../assets/five.mp3"

// start detection
export const handleStartDetection = (load: Function) => {
    load(Start_Detection, {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// detection finishes
export const handleDetectionFinish = (load: Function) => {
    load(Detection_finishes, {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// start capture
export const handleStartCapture = (load: Function) => {
    load(Start_Capture, {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// capturing finishes
export const handleCaptureFinish = (load: Function) => {
    load(Capturing_Finishes, {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// capturing
export const handleCaptureAt = (load: Function, no: number) => {
    switch (no){
        // first caputure
        case 1:
            load(First_Capture, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        case 2:
            load(Second_Capture, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        case 3:
            load(Third_Capture, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        default:
    }
}
// count when right direction
export const handleCount = (load:Function, no: number) => {
    switch (no) {
        // one
        case 1 :
            load(one, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // two
        case 2:
            load(two, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // three
        case 3:
            load(three, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // four
        case 4:
            load(four, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // five
        case 5:
            load(five, {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // otherwise
        default:
    }
}