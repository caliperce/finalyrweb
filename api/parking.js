// Import Firebase Admin SDK
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

// Helper function to set CORS headers
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
}

export default async function handler(req, res) {
    console.log('API Route called:', req.url);
    console.log('Query parameters:', req.query);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    // Set CORS headers for all responses
    setCorsHeaders(res);
    
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    try {
        const db = admin.firestore();
        
        // Get the action from the path instead of query
        const action = req.query.type || 'latest-entry';
        console.log('Processing action:', action);
        
        switch (action) {
            case 'latest-entry':
                console.log('Fetching latest entry from Firestore...');
                // Get latest entry logic
                const latestEntry = await db.collection('active_parking')
                    .where('status', '==', 'active')
                    .orderBy('entryTimestamp', 'desc')
                    .limit(1)
                    .get();
                
                if (latestEntry.empty) {
                    console.log('No active entries found');
                    return res.json({ success: true, data: null });
                }
                
                const entryData = latestEntry.docs[0].data();
                console.log('Found latest entry:', entryData);
                return res.json({ success: true, data: entryData });
                
            case 'latest-exit':
                console.log('Fetching latest exit from Firestore...');
                // Get latest exit logic
                const latestExit = await db.collection('active_parking')
                    .where('status', '==', 'pending_payment')
                    .orderBy('exitTimestamp', 'desc')
                    .limit(1)
                    .get();
                    
                if (latestExit.empty) {
                    console.log('No pending payments found');
                    return res.json({ success: true, data: null });
                }
                
                const exitData = latestExit.docs[0].data();
                console.log('Found latest exit:', exitData);
                return res.json({ success: true, data: exitData });
                
            default:
                console.log('Invalid action requested:', action);
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
} 