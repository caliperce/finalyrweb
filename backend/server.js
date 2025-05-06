require('dotenv').config();
// Debug logging for environment variables
console.log('Environment Variables Check:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing');
console.log('S3_BUCKET:', process.env.S3_BUCKET);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { processImage } = require('./utils/imageProcessor');
const { setupS3 } = require('./utils/s3Handler');
const { setupOpenAI } = require('./utils/openaiHandler');
const admin = require('firebase-admin');
const twilio = require('twilio');
const { calculateParkingFee } = require('./utils/parkingCalculator');
const { sendParkingMessage } = require('../twilio.js');  // Import the new twilio module

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://192.168.90.127:3000',  // College
        'http://192.168.0.123:3000'    // Home
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Add cache prevention middleware
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');
    next();
});

app.use(express.json());

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Initialize Firebase Admin
const serviceAccount = require('./userinfo-10027-firebase-adminsdk-fbsvc-141115c0e9.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint to simulate a license plate detection
app.get('/test-entry/:licensePlate', async (req, res) => {
    try {
        console.log('🔄 Starting test entry for license plate:', req.params.licensePlate);
        
        // First check if there's already an active entry for this license plate
        const activeParkingRef = db.collection('active_parking');
        const existingQuery = await activeParkingRef
            .where('licensePlate', '==', req.params.licensePlate)
            .where('status', '==', 'active')
            .get();
            
        if (!existingQuery.empty) {
            console.log('⚠️ Active entry already exists for this license plate');
            return res.status(400).json({ 
                success: false, 
                error: 'Active entry already exists for this license plate' 
            });
        }

        const testData = {
            success: true,
            licensePlate: req.params.licensePlate,
            timestamp: new Date().toISOString(),
            imageUrl: 'https://my-s3-demo-bucket120d34ec035034aa08ef2893f643caf6f.s3.us-west-1.amazonaws.com/entry/2025-03-20T18:06:20.186Z-capture.jpg'
        };
        
        // Store as latest entry
        global.latestEntry = testData;
        
        // Create new parking entry in Firebase
        const newParkingDoc = {
            licensePlate: testData.licensePlate,
            entryTimestamp: testData.timestamp,
            status: 'active',
            entryImageUrl: testData.imageUrl,
            exitImageUrl: null,
            createdAt: new Date().toISOString()
        };
        
        console.log('📝 Attempting to create new parking document:', newParkingDoc);
        
        // Add the document to Firebase
        try {
            const docRef = await activeParkingRef.add(newParkingDoc);
            console.log('✅ Successfully created new parking entry with ID:', docRef.id);
            
            // Verify the document was created
            const createdDoc = await docRef.get();
            if (!createdDoc.exists) {
                throw new Error('Document was not created successfully');
            }
            
            console.log('✅ Document verification successful. Data:', createdDoc.data());
            res.json({
                ...testData,
                parkingId: docRef.id
            });
        } catch (firebaseError) {
            console.error('❌ Firebase operation failed:', firebaseError);
            throw new Error(`Firebase operation failed: ${firebaseError.message}`);
        }
    } catch (error) {
        console.error('❌ Error in test-entry endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Error creating parking entry in Firebase'
        });
    }
});

// Test endpoint to simulate a vehicle exit
app.get('/test-exit/:licensePlate', async (req, res) => {
    try {
        const testData = {
            success: true,
            licensePlate: req.params.licensePlate,
            exitTimestamp: new Date().toISOString(),
            hasPaid: false,
            imageUrl: 'https://my-s3-demo-bucket120d34ec035034aa08ef2893f643caf6f.s3.us-west-1.amazonaws.com/exit/2025-03-20T18:06:20.186Z-capture.jpg'
        };
        
        // Store as latest exit
        global.latestExit = testData;
        
        // Find the user with this license plate
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('licensePlates', 'array-contains', testData.licensePlate).get();
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.phoneNumber) {
                // Calculate a sample duration and fee for testing
                const duration = "1 hour";
                const fee = 5.00;
                
                // Send SMS notification
                await sendParkingMessage(userData.phoneNumber, duration, fee);
                console.log('📱 SMS notification sent to:', userData.phoneNumber);
            } else {
                console.log('⚠️ User has no phone number registered');
            }
        } else {
            console.log('⚠️ No user found with this license plate');
        }
        
        console.log('📝 Test exit created:', testData);
        res.json(testData);
    } catch (error) {
        console.error('Error in test exit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to get latest entry
app.get('/latest-entry', (req, res) => {
    // If there's no latest entry data, return null
    if (!global.latestEntry) {
        return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: global.latestEntry });
});
// Endpoint to get latest exit
app.get('/latest-exit', async (req, res) => {
    try {
        // If there's no latest exit data, return null
        if (!global.latestExit) {
            return res.json({ success: true, data: null });
        }

        const exitData = global.latestExit;
        console.log('📤 Processing exit data:', exitData);

        // Find the user with this license plate
        const usersRef = db.collection('users');
        console.log('🔍 Searching for user with license plate:', exitData.licensePlate);
        const snapshot = await usersRef.where('licensePlates', 'array-contains', exitData.licensePlate).get();

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            console.log('✅ Found user:', userData.email);

            // Find active parking entry for this license plate
            const activeParkingRef = db.collection('active_parking');
            const q = db.collection('active_parking').where('licensePlate', '==', exitData.licensePlate).where('status', '==', 'active');
            
            const parkingSnapshot = await q.get();
            
            if (!parkingSnapshot.empty) {
                const parkingDoc = parkingSnapshot.docs[0];
                const parkingData = parkingDoc.data();

                // Calculate duration and fee
                const entryTime = new Date(parkingData.entryTimestamp);
                const exitTime = new Date(exitData.exitTimestamp);
                const durationMs = exitTime - entryTime;

                // Format duration
                const hours = Math.floor(durationMs / 3600000);
                const minutes = Math.floor((durationMs % 3600000) / 60000);
                const formattedDuration = `${hours} hours, ${minutes} minutes`;

                // Calculate fee ($2 per hour, minimum 1 hour)
                const hourlyRate = 2;
                const billableHours = Math.max(1, Math.ceil(durationMs / 3600000));
                const parkingFee = billableHours * hourlyRate;

                if (userData.phoneNumber) {
                    console.log('📱 Attempting to send SMS to:', userData.phoneNumber);
                    console.log('SMS Details:', {
                        duration: formattedDuration,
                        fee: parkingFee,
                        phone: userData.phoneNumber
                    });

                    // Send SMS notification
                    try {
                        const smsSent = await sendParkingMessage(
                            userData.phoneNumber,
                            formattedDuration,
                            parkingFee
                        );
                        
                        if (smsSent) {
                            console.log('✅ SMS sent successfully');
                        } else {
                            console.log('❌ Failed to send SMS');
                        }
                    } catch (smsError) {
                        console.error('❌ Error sending SMS:', smsError);
                        console.error('Error details:', smsError);
                    }
                } else {
                    console.log('⚠️ User has no phone number registered');
                }

                // Update parking entry status
                await parkingDoc.ref.update({
                    status: 'pending_payment',
                    exitTimestamp: exitData.exitTimestamp,
                    parkingDuration: formattedDuration,
                    parkingFee: parkingFee
                });
            }
        } else {
            console.log('⚠️ No user found with license plate:', exitData.licensePlate);
        }

        // Return the exit data
        console.log('📤 Sending exit data:', exitData);
        return res.json({ success: true, data: exitData });
    } catch (error) {
        console.error('Error in latest-exit endpoint:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Test endpoint to simulate a vehicle exit with SMS
app.get('/test-exit-with-sms/:licensePlate', async (req, res) => {
    try {
        console.log('🔄 Testing exit with SMS for license plate:', req.params.licensePlate);
        console.log('🔍 Checking environment variables:');
        console.log('   - TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
        console.log('   - TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
        console.log('   - TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? process.env.TWILIO_PHONE_NUMBER : 'Missing');
        
        // Create test exit data
        const testExitData = {
            success: true,
            licensePlate: req.params.licensePlate,
            exitTimestamp: new Date().toISOString(),
            hasPaid: false,
            imageUrl: 'https://my-s3-demo-bucket120d34ec035034aa08ef2893f643caf6f.s3.us-west-1.amazonaws.com/exit/2025-04-09T11%3A16%3A15.982Z-capture.jpg'
        };
        
        // Store as latest exit
        global.latestExit = testExitData;
        
        // Find the user with this license plate
        const usersRef = db.collection('users');
        console.log('🔍 Searching for user with license plate:', req.params.licensePlate);
        const snapshot = await usersRef.where('licensePlates', 'array-contains', req.params.licensePlate).get();
        
        if (snapshot.empty) {
            console.log('❌ No user found with license plate:', req.params.licensePlate);
            return res.status(404).json({ error: 'No user found with this license plate' });
        }
        
        // Get the user document
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        console.log('✅ Found user:', userData.email);
        
        // Check if user has a phone number
        if (!userData.phoneNumber) {
            console.log('❌ User has no phone number registered:', userData.email);
            return res.status(400).json({ error: 'User has no phone number registered' });
        }
        
        // Find the active parking entry
        const activeParkingRef = db.collection('active_parking');
        console.log('🔍 Searching for active parking entry...');
        const parkingSnapshot = await activeParkingRef
            .where('licensePlate', '==', req.params.licensePlate)
            .where('status', '==', 'active')
            .get();
            
        if (parkingSnapshot.empty) {
            console.log('❌ No active parking found for license plate:', req.params.licensePlate);
            return res.status(404).json({ error: 'No active parking found' });
        }
        
        const parkingDoc = parkingSnapshot.docs[0];
        const parkingData = parkingDoc.data();
        console.log('✅ Found active parking entry:', parkingData);
        
        // Calculate duration and fee
        const entryTime = new Date(parkingData.entryTimestamp);
        const exitTime = new Date();
        const { duration, fee } = calculateParkingFee(entryTime, exitTime);
        console.log('💰 Calculated parking fee:', { duration, fee });
        
        // Send SMS
        console.log('📱 Attempting to send SMS to:', userData.phoneNumber);
        const smsSent = await sendParkingMessage(userData.phoneNumber, duration, fee);
        
        if (!smsSent) {
            console.log('❌ Failed to send SMS');
            return res.status(500).json({ error: 'Failed to send SMS' });
        }
        
        // Update parking entry status
        console.log('📝 Updating parking entry status...');
        await parkingDoc.ref.update({
            status: 'pending_payment',
            exitTimestamp: testExitData.exitTimestamp,
            parkingDuration: duration,
            parkingFee: fee
        });
        
        console.log('✅ Successfully processed test exit with SMS');
        res.json({
            success: true,
            message: 'Test exit processed and SMS sent',
            details: {
                phoneNumber: userData.phoneNumber,
                duration,
                fee,
                parkingId: parkingDoc.id
            }
        });
    } catch (error) {
        console.error('❌ Error processing test exit:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Entry point image upload endpoint
app.post('/upload/entry', upload.single('image'), async (req, res) => {
    try {
        console.log('=== New Entry Request Received ===');
        console.log('Timestamp:', new Date().toISOString());
        
        if (!req.file) {
            console.log('❌ Error: No image file provided');
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        console.log('📸 Image received successfully');
        console.log('Image details:', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        console.log('🔄 Processing image...');
        try {
            const result = await processImage(req.file, 'entry');
            console.log('✅ Image processing completed');
            console.log('Raw result:', result);
            
            const analysisObj = result.analysis;
            console.log('Analysis object:', analysisObj);
            
            const licensePlate = analysisObj.license_plate;
            console.log('🔍 License plate detected:', licensePlate);
            
            // Check if there's already an active entry for this license plate
            const activeParkingRef = db.collection('active_parking');
            const existingQuery = await activeParkingRef
                .where('licensePlate', '==', licensePlate)
                .where('status', '==', 'active')
                .get();
                
            if (!existingQuery.empty) {
                console.log('⚠️ Active entry already exists for this license plate');
                return res.status(400).json({ 
                    success: false, 
                    error: 'Active entry already exists for this license plate' 
                });
            }
            
            // Create new parking entry in Firebase with image URL
            const newParkingDoc = {
                licensePlate: licensePlate,
                entryTimestamp: result.timestamp,
                status: 'active',
                entryImageUrl: result.imageUrl,
                exitImageUrl: null,
                createdAt: new Date().toISOString()
            };
            
            console.log('📝 Attempting to create new parking document:', newParkingDoc);
            
            // Add the document to Firebase
            try {
                const docRef = await activeParkingRef.add(newParkingDoc);
                console.log('✅ Successfully created new parking entry with ID:', docRef.id);
                
                // Verify the document was created
                const createdDoc = await docRef.get();
                if (!createdDoc.exists) {
                    throw new Error('Document was not created successfully');
                }
                
                console.log('✅ Document verification successful. Data:', createdDoc.data());
                
                const responseData = {
                    success: true,
                    licensePlate,
                    timestamp: result.timestamp,
                    imageUrl: result.imageUrl,
                    parkingId: docRef.id
                };
                
                // Store the latest entry globally
                global.latestEntry = responseData;
                
                console.log('📤 Sending response to frontend:', responseData);
                res.json(responseData);
            } catch (firebaseError) {
                console.error('❌ Firebase operation failed:', firebaseError);
                throw new Error(`Firebase operation failed: ${firebaseError.message}`);
            }
        } catch (processError) {
            console.error('❌ Error in processImage:', processError);
            res.status(500).json({ 
                error: 'Failed to process entry image',
                details: processError.message 
            });
        }
    } catch (error) {
        console.error('❌ Error processing entry image:', error);
        res.status(500).json({ 
            error: 'Failed to process entry image',
            details: error.message 
        });
    }
});

// Exit point image upload endpoint
app.post('/upload/exit', upload.single('image'), async (req, res) => {
    try {
        console.log('=== New Exit Request Received ===');
        
        if (!req.file) {
            console.log('❌ Error: No image file provided');
            return res.status(400).json({ error: 'No image file provided' });
        }

        const customMessage = req.body.customMessage || null;
        console.log('📝 Custom message provided:', customMessage);

        // Process the exit image
        console.log('🔄 Processing exit image...');
        const result = await processImage(req.file, 'exit');
        console.log('✅ Image processing completed:', result);
        
        const licensePlate = result.analysis.license_plate;
        const exitTimestamp = result.timestamp;
        
        // Find active parking entry for this license plate
        console.log('🔍 Searching for active parking entry...');
        const activeParkingRef = db.collection('active_parking');
        const q = activeParkingRef.where('licensePlate', '==', licensePlate).where('status', '==', 'active');
        
        const querySnapshot = await q.get();
        
        if (querySnapshot.empty) {
            console.log('❌ No active parking found for license plate:', licensePlate);
            return res.status(404).json({ error: 'No active parking found' });
        }

        // Get parking details and calculate fees
        const parkingDoc = querySnapshot.docs[0];
        const parkingData = parkingDoc.data();
        
        const entryTime = new Date(parkingData.entryTimestamp);
        const exitTime = new Date(exitTimestamp);
        const durationMs = exitTime - entryTime;

        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const formattedDuration = `${hours} hours, ${minutes} minutes`;

        const hourlyRate = 2;
        const billableHours = Math.max(1, Math.ceil(durationMs / 3600000));
        const parkingFee = billableHours * hourlyRate;

        // Update parking entry with exit information AND image URL
        console.log('📝 Updating parking entry with exit image URL...');
        await parkingDoc.ref.update({
            exitTimestamp: exitTimestamp,
            status: 'pending_payment',
            parkingDuration: formattedDuration,
            parkingDurationMs: durationMs,
            parkingFee: parkingFee,
            hasPaid: false,
            exitImageUrl: result.imageUrl  // Store the exit image URL
        });
        console.log('✅ Parking entry updated with exit image URL');

        // Handle SMS notifications and other logic...
        // [Previous SMS notification code remains unchanged]

        const responseData = {
            success: true,
            licensePlate,
            exitTimestamp,
            hasPaid: false,
            imageUrl: result.imageUrl,
            parkingFee,
            parkingDuration: formattedDuration
        };

        // Store the latest exit globally
        global.latestExit = responseData;

        console.log('📤 Sending response:', responseData);
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Error processing exit:', error);
        res.status(500).json({ error: 'Failed to process exit' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`\n=== Backend Server Started ===`);
    console.log(`📍 Local access: http://localhost:${PORT}`);
    console.log(`📍 College access: http://192.168.90.127:${PORT}`);
    console.log(`📍 Home access: http://192.168.0.123:${PORT}`);
    console.log(`\n🔥 Test URLs:`);
    console.log(`   College Test Entry: http://192.168.90.127:${PORT}/test-entry/TNAB43567`);
    console.log(`   Home Test Entry: http://192.168.0.123:${PORT}/test-entry/TNAB43567`);
    console.log(`===================\n`);
});

// Function to fetch latest image URLs for a license plate
async function fetchImageUrls(licensePlate) {
    try {
        // Fetch entry image URL
        const entryResponse = await fetch(`${SERVER_URL}/latest-entry?licensePlate=${licensePlate}`);
        const entryData = await entryResponse.json();
        
        // Fetch exit image URL
        const exitResponse = await fetch(`${SERVER_URL}/latest-exit?licensePlate=${licensePlate}`);
        const exitData = await exitResponse.json();

        return {
            entryImageUrl: entryData.data?.imageUrl || '',
            exitImageUrl: exitData.data?.imageUrl || ''
        };
    } catch (error) {
        console.error('Error fetching image URLs:', error);
        return { entryImageUrl: '', exitImageUrl: '' };
    }
}

module.exports = {
    fetchImageUrls
}