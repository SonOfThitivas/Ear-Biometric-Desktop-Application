// start detection
export const handleStartDetection = (load: Function) => {
    load("/public/voice/Start Detection.mp3", {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// detection finishes
export const handleDetectionFinish = (load: Function) => {
    load("/public/voice/Detection finishes.mp3", {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// start capture
export const handleStartCapture = (load: Function) => {
    load("/public/voice/Start Capture.mp3", {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// capturing finishes
export const handleCaptureFinish = (load: Function) => {
    load("/public/voice/Capturing Finishes.mp3", {
        autoplay: true,
        initialVolume: 1.0,
    })
}
// capturing
export const handleCaptureAt = (load: Function, no: number) => {
    switch (no){
        // first caputure
        case 1:
            load("/public/voice/First Capture.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        case 2:
            load("/public/voice/Second Capture.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        case 3:
            load("/public/voice/Third Capture.mp3", {
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
            load("/public/voice/one.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // two
        case 2:
            load("/public/voice/two.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // three
        case 3:
            load("/public/voice/three.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // four
        case 4:
            load("/public/voice/four.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // five
        case 5:
            load("/public/voice/five.mp3", {
                autoplay: true,
                initialVolume: 1.0,
            })
            break
        // otherwise
        default:
    }
}