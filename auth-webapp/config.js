// Configuration for backend URLs
const config = {
    // Backend URL configuration
    BACKEND_URL: (() => {
        // Check if we're in development or production
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname === '192.168.90.127' ||
                            window.location.hostname === '192.168.0.123';

        // If in development, use local backend
        if (isDevelopment) {
            return window.location.hostname === '192.168.0.123'
                ? 'http://192.168.0.123:3001'    // Home network
                : 'http://192.168.90.127:3001';  // College network
        }

        // In production (Vercel), we'll need to manually set this
        return localStorage.getItem('BACKEND_URL') || 'http://localhost:3001';
    })(),

    // Helper functions
    setBackendUrl: (url) => {
        localStorage.setItem('BACKEND_URL', url);
        window.location.reload(); // Reload to apply new URL
    }
};

// Firebase configuration
const firebaseConfig = {
  apiKey: window.ENV_FIREBASE_API_KEY,
  authDomain: window.ENV_FIREBASE_AUTH_DOMAIN,
  projectId: window.ENV_FIREBASE_PROJECT_ID,
  storageBucket: window.ENV_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID,
  appId: window.ENV_FIREBASE_APP_ID,
  measurementId: window.ENV_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default config; 