// Configuration for backend URLs
const config = {
    // Detect environment and set appropriate backend URL
    BACKEND_URL: window.location.hostname.includes('github.io') 
        ? 'http://192.168.90.127:3001'  // When hosted on GitHub Pages, use college IP
        : window.location.hostname === '192.168.0.123'
            ? 'http://192.168.0.123:3001'  // When accessed from home
            : 'http://192.168.90.127:3001', // Default to college IP

    // Test if we're in the college environment
    isCollege: () => window.location.hostname === '192.168.90.127',
    
    // Test if we're in the home environment
    isHome: () => window.location.hostname === '192.168.0.123',

    firebase: {
        apiKey: window.ENV_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        authDomain: window.ENV_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
        projectId: window.ENV_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        storageBucket: window.ENV_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: window.ENV_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
        measurementId: window.ENV_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
    }
};

export default config; 