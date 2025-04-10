require('dotenv').config();
const NodeWebcam = require('node-webcam');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Configure webcam options
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 1,
    saveShots: true,
    output: "jpeg",
    device: "/dev/video0",
    callbackReturn: "buffer",
    verbose: true,
    // Additional options for better quality
    skip: 10,        // Skip first 10 frames
    rotate: 0,       // Rotate if needed (0, 90, 180, or 270)
    nopreview: true, // Don't show preview window
    // Set specific resolution
    setWidth: 1280,
    setHeight: 720
};

// Initialize webcam
const Webcam = NodeWebcam.create(webcamOptions);

// Function to capture image
function captureImage() {
    return new Promise((resolve, reject) => {
        Webcam.capture('capture', (err, data) => {
            if (err) {
                console.error("Failed to capture image:", err);
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

// Function to send image to server
async function sendImageToServer(imagePath, endpoint) {
    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const serverUrl = process.env.SERVER_URL ||'http://192.168.90.127:3001'; // Default to original IP if env var not set
        console.log(`📤 Sending to ${serverUrl}/${endpoint}`);

        const response = await axios.post(`${serverUrl}/${endpoint}`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('✅ Server response:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error sending image to server:', error.message);
        throw error;
    }
}

// Main function to capture and send image
async function captureAndSend(endpoint = 'upload/entry') {
    try {
        console.log('Capturing image...');
        await captureImage();
        console.log('Image captured successfully');

        console.log(`Sending image to ${endpoint}...`);
        const result = await sendImageToServer('capture.jpg', endpoint);
        console.log('Image processed successfully:', result);

        // Clean up - delete the temporary image file
        fs.unlinkSync('capture.jpg');
        
        // Check if a license plate was detected
        if (result && result.success && result.licensePlate) {
            console.log('✅ License plate detected:', result.licensePlate);
            return { 
                success: true, 
                licensePlate: result.licensePlate,
                result: result 
            };
        } else {
            console.log('❌ No license plate detected in this image');
            return { success: false };
        }
    } catch (error) {
        console.error('Error in capture and send process:', error);
        return { success: false, error };
    }
}

// Function to start continuous capture mode
async function startContinuousCapture(interval = 5000, endpoint = 'upload/entry') {
    console.log(`Starting continuous capture mode. Capturing every ${interval/1000} seconds...`);
    console.log('Will stop automatically once a license plate is detected');
    console.log('Press Ctrl+C to stop manually');
    
    // Variable to store the interval ID
    let captureInterval;
    
    // Capture and send immediately
    const initialResult = await captureAndSend(endpoint);
    
    // Check if we already detected a license plate in the first capture
    if (initialResult && initialResult.success && initialResult.licensePlate) {
        console.log('🎯 License plate detected on first try! Stopping capture process.');
        return null; // No interval to return since we're done
    }
    
    // If no license plate detected yet, set up the interval
    return new Promise((resolve) => {
        captureInterval = setInterval(async () => {
            const result = await captureAndSend(endpoint);
            
            // If license plate is detected, stop the interval
            if (result && result.success && result.licensePlate) {
                console.log('🎯 License plate detected! Stopping capture process.');
                clearInterval(captureInterval);
                resolve(result);
            }
        }, interval);
    });
}

// Example usage:
// To capture and send an entry image:
// captureAndSend('upload/entry');
// To capture and send an exit image:
// captureAndSend('upload/exit');

// Export functions for external use
module.exports = {
    captureAndSend,
    captureImage,
    startContinuousCapture
}; 