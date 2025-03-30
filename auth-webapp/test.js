// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB-WA4jjwIiy3BoabtKTNC2LYJfweibqI4",
    authDomain: "userinfo-10027.firebaseapp.com",
    projectId: "userinfo-10027",
    storageBucket: "userinfo-10027.firebasestorage.app",
    messagingSenderId: "605892604762",
    appId: "1:605892604762:web:e4e6f1231f144e2e983963",
    measurementId: "G-HVK6HKR639"
};

// Initialize Firebase
console.log("Initializing Firebase for test...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function to create a document in registered_users collection
async function testCreateUser(email) {
    try {
        console.log("=== TEST: CREATING USER DOCUMENT ===");
        console.log("Test email:", email);
        
        // Create a test user ID with timestamp to make it unique
        const testUserId = "test-" + Date.now();
        console.log("Generated test user ID:", testUserId);
        
        // Create data for the new user
        const userData = {
            email: email,
            licensePlates: ["TEST123"],
            created: new Date().toISOString(),
            uid: testUserId
        };
        
        console.log("Test user data:", JSON.stringify(userData));
        
        // Step 1: Get a reference to the registered_users collection
        console.log("Creating reference to registered_users collection...");
        const collectionRef = collection(db, "registered_users");
        
        // Step 2: Create a document reference with the test user ID
        console.log("Creating document reference with test user ID...");
        const userDocRef = doc(collectionRef, testUserId);
        
        // Step 3: Set the document data
        console.log("Setting document data...");
        await setDoc(userDocRef, userData);
        console.log("Document created successfully!");
        
        // Step 4: Verify the document was created
        console.log("Verifying document was created...");
        const docSnapshot = await getDoc(userDocRef);
        
        if (docSnapshot.exists()) {
            console.log("Document verification successful! Data:", docSnapshot.data());
            return {
                success: true,
                docId: testUserId,
                email: email,
                data: docSnapshot.data()
            };
        } else {
            console.error("Document was not created successfully!");
            return {
                success: false,
                error: "Document verification failed"
            };
        }
    } catch (error) {
        console.error("Error creating test document:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        return {
            success: false,
            error: error.message || "An unknown error occurred"
        };
    }
}

// Make the function available globally
window.testCreateUser = testCreateUser;

// Output instructions
console.log("Test file loaded. Call window.testCreateUser('your@email.com') to test creating a user."); 