require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { processImage } = require('./utils/imageProcessor');
const { setupS3 } = require('./utils/s3Handler');
const { setupOpenAI } = require('./utils/openaiHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;  // Using port 3001
const HOST = '0.0.0.0';

// Middleware
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST'],  // Allow GET and POST methods
    allowedHeaders: ['Content-Type']  // Allow Content-Type header
}));
app.use(express.json());

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint to simulate a license plate detection
app.get('/test-entry/:licensePlate', (req, res) => {
    const testData = {
        success: true,
        licensePlate: req.params.licensePlate,
        timestamp: new Date().toISOString(),
        imageUrl: 'https://my-s3-demo-bucket120d34ec035034aa08ef2893f643caf6f.s3.us-west-1.amazonaws.com/entry/2025-03-20T18:06:20.186Z-capture.jpg'
    };
    
    // Store as latest entry
    global.latestEntry = testData;
    
    console.log('📝 Test entry created:', testData);
    res.json(testData);
});

// Test endpoint to simulate a vehicle exit
app.get('/test-exit/:licensePlate', (req, res) => {
    const testData = {
        success: true,
        licensePlate: req.params.licensePlate,
        exitTimestamp: new Date().toISOString(),
        hasPaid: false,
        imageUrl: 'https://my-s3-demo-bucket120d34ec035034aa08ef2893f643caf6f.s3.us-west-1.amazonaws.com/exit/2025-03-20T18:06:20.186Z-capture.jpg'
    };
    
    // Store as latest exit
    global.latestExit = testData;
    
    console.log('📝 Test exit created:', testData);
    res.json(testData);
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
app.get('/latest-exit', (req, res) => {
    // If there's no latest exit data, return null
    if (!global.latestExit) {
        return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: global.latestExit });
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
        const result = await processImage(req.file, 'entry');
        console.log('✅ Image processing completed');
        console.log('Raw result:', result);
        
        // The analysis is already an object, no need to parse
        const analysisObj = result.analysis;
        console.log('Analysis object:', analysisObj);
        
        // Extract license plate from the analysis object
        const licensePlate = analysisObj.license_plate;
        console.log('🔍 License plate detected:', licensePlate);
        
        const responseData = {
            success: true,
            licensePlate,
            timestamp: result.timestamp,
            imageUrl: result.imageUrl
        };
        
        // Store the latest entry globally
        global.latestEntry = responseData;
        
        console.log('📤 Sending response to frontend:', responseData);
        res.json(responseData);
        console.log('=== Entry Request Completed ===\n');
    } catch (error) {
        console.error('❌ Error processing entry image:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to process entry image' });
    }
});

// Exit point image upload endpoint
app.post('/upload/exit', upload.single('image'), async (req, res) => {
    try {
        console.log('=== New Exit Request Received ===');
        console.log('Timestamp:', new Date().toISOString());
        
        if (!req.file) {
            console.log('❌ Error: No image file provided');
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        console.log('📸 Exit image received successfully');
        console.log('Image details:', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        console.log('🔄 Processing exit image...');
        const result = await processImage(req.file, 'exit');
        console.log('✅ Exit image processing completed');
        console.log('Raw result:', result);
        
        // The analysis is already an object, no need to parse
        const analysisObj = result.analysis;
        console.log('Analysis object:', analysisObj);
        
        // Extract license plate from the analysis object
        const licensePlate = analysisObj.license_plate;
        console.log('🔍 License plate detected at exit:', licensePlate);
        
        const responseData = {
            success: true,
            licensePlate,
            exitTimestamp: result.timestamp,
            hasPaid: false,
            imageUrl: result.imageUrl
        };
        
        // Store the latest exit globally
        global.latestExit = responseData;
        
        console.log('📤 Sending exit response to frontend:', responseData);
        res.json(responseData);
        console.log('=== Exit Request Completed ===\n');
    } catch (error) {
        console.error('❌ Error processing exit image:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to process exit image' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`=== Server Started ===`);
    console.log(`🌐 Server running at http://${HOST}:${PORT}`);
    console.log(`📍 Local access: http://localhost:${PORT}`);
    console.log(`📍 Network access (Location 1): http://192.168.90.27:${PORT}`);
    console.log(`📍 Network access (Location 2): http://192.168.0.123:${PORT}`);
    console.log(`🔥 Test URLs:`);
    console.log(`   Location 1: http://192.168.90.27:${PORT}/test-entry/TNAB43567`);
    console.log(`   Location 2: http://192.168.0.123:${PORT}/test-entry/TNAB43567`);
    console.log(`===================`);
}); 