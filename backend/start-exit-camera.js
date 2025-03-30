const { startContinuousCapture } = require('./camera-client');

// Configuration
const CAPTURE_INTERVAL = 5000; // Capture every 5 seconds
const ENDPOINT = 'upload/exit'; // Endpoint for exit camera

// Start the continuous capture
console.log('Starting exit camera capture...');
console.log('This camera will detect vehicles leaving the parking area');
console.log('Capturing will stop automatically when a license plate is detected');

startContinuousCapture(CAPTURE_INTERVAL, ENDPOINT)
    .then(result => {
        if (result && result.licensePlate) {
            console.log('✅ Exit camera successfully detected license plate:', result.licensePlate);
            console.log('📤 Exit information sent to server');
            console.log('📱 Dashboard will be updated with exit information');
            console.log('💰 Payment will be required for this license plate');
            
            // Exit the process when done - usually we would restart the camera here
            // but for the demo, we'll exit cleanly
            setTimeout(() => {
                console.log('Exit camera process complete - restart to detect another vehicle');
                process.exit(0);
            }, 2000);
        }
    })
    .catch(error => {
        console.error('❌ Error in exit camera capture process:', error);
        process.exit(1);
    }); 