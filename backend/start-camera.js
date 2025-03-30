const { startContinuousCapture } = require('./camera-client');

// Configuration
const CAPTURE_INTERVAL = 5000; // Capture every 5 seconds
const ENDPOINT = 'upload/entry'; // Entry camera endpoint

// Start the continuous capture
console.log('Starting entry camera capture...');
console.log('This camera will detect vehicles entering the parking area');
console.log('Capturing will stop automatically when a license plate is detected');

startContinuousCapture(CAPTURE_INTERVAL, ENDPOINT)
    .then(result => {
        if (result && result.licensePlate) {
            console.log('✅ Entry camera successfully detected license plate:', result.licensePlate);
            console.log('📤 Entry information sent to server');
            console.log('📱 Dashboard will be updated with new entry');
            
            // Exit the process when done - usually we would restart the camera here
            // but for the demo, we'll exit cleanly
            setTimeout(() => {
                console.log('Entry camera process complete - restart to detect another vehicle');
                process.exit(0);
            }, 2000);
        }
    })
    .catch(error => {
        console.error('❌ Error in entry camera capture process:', error);
        process.exit(1);
    }); 