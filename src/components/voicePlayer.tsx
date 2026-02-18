export const handleStartDetection = (load) => {
    load("/public/voice/startDetection.m4a", {
        autoplay: true,
        initialVolume: 1.0,
    })
}

export const handleDetectionFinish = (load) => {
    load("/public/voice/endDetection.m4a", {
        autoplay: true,
        initialVolume: 1.0,
    })
}
