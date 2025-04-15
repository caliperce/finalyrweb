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
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
const app = initializeApp(firebaseConfig);

export default config;
export { app }; 