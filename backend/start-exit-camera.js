const { startContinuousCapture } = require('./camera-client');

// Configuration
const CAPTURE_INTERVAL = 7000; // Capture every 7 seconds
const ENDPOINT = 'upload/exit'; // Endpoint for exit camera

// Start the continuous capture
console.log('Starting exit camera capture...');
console.log('This camera will detect vehicles leaving the parking area');
console.log('Capturing will stop automatically when a license plate is detected');
console.log(`Will capture images every ${CAPTURE_INTERVAL/1000} seconds`);

startContinuousCapture(CAPTURE_INTERVAL, ENDPOINT)
    .then(result => {
        if (result && result.licensePlate) {
            console.log('✅ Exit camera successfully detected license plate:', result.licensePlate);
            console.log('📤 Exit information sent to server');
            console.log('📱 Dashboard will be updated with exit information');
            console.log('💰 Payment will be required for this license plate');
            
            // Exit the process when done
            console.log('Exit camera process complete - restart to detect another vehicle');
            process.exit(0);
        }
    })
    .catch(error => {
        console.error('❌ Error in exit camera capture process:', error);
        process.exit(1);
    }); 