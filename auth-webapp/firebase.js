// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-analytics.js";
import { 
    getFirestore,
    collection,
    doc,
    setDoc,
    deleteDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

// Your web app's Firebase configuration
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
console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);

// Initialize Firestore
console.log("Initializing Firestore...");
const db = getFirestore(app);

// Initialize Auth
console.log("Initializing Auth...");
const auth = getAuth(app);

// Initialize Analytics
const analytics = getAnalytics(app);

// Test Firestore connection
const testFirestore = async () => {
    try {
        console.log("Testing Firestore connection...");
        
        // Test writing to test_collection only
        const testRef = doc(collection(db, "test_collection"), "test_document");
        await setDoc(testRef, {
            test: true,
            timestamp: new Date().toISOString()
        });
        console.log("Successfully wrote to test_collection!");
        
        // Skip creating test documents in the actual collections
        console.log("Skipping test writes to other collections to avoid confusion");
        
    } catch (error) {
        console.error("Error testing Firestore:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        throw error;
    }
};

// Run the test
testFirestore().catch(console.error);

// Export the initialized services
export { db, auth };

// Helper function for creating user documents
export async function createUserDocument(userId, userData) {
    console.log("Helper function: Creating user document for:", userId);
    try {
        // Approach 1: Standard setDoc
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, userData);
        console.log("Helper: Created user document with standard approach");
        return { success: true, method: "standard" };
    } catch (error1) {
        console.error("Helper: Standard approach failed:", error1);
        
        try {
            // Approach 2: Add to a different collection
            const alternateRef = collection(db, "user_profiles");
            await addDoc(alternateRef, {
                ...userData,
                userId: userId
            });
            console.log("Helper: Created user document in alternate collection");
            return { success: true, method: "alternate" };
        } catch (error2) {
            console.error("Helper: Alternate approach failed:", error2);
            throw new Error("All approaches failed");
        }
    }
}