const NodeWebcam = require('node-webcam');

// Configure webcam options
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: "/dev/video0", // Specify your webcam device
    callbackReturn: "buffer"
};

// Initialize webcam
const Webcam = NodeWebcam.create(webcamOptions);

// Take a test photo
console.log('Taking a test photo...');
Webcam.capture('test-photo', (err, data) => {
    if (err) {
        console.error('Error capturing photo:', err);
        return;
    }
    console.log('Photo captured successfully! Check test-photo.jpg');
}); 