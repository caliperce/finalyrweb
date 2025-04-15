// Add immediate console log to check if the file is being loaded
console.log("app.js is loading...");

// First ensure you have all required imports at the top
console.log("Starting app.js...");

// Add global form switching function
window.showForm = function(formId) {
    console.log("Showing form:", formId);
    // Hide all forms first
    document.getElementById("login-container").style.display = 'none';
    document.getElementById("signup-form").style.display = 'none';
    document.getElementById("reset-password-form").style.display = 'none';
    document.getElementById("user-profile").style.display = 'none';
    
    // Show the requested form
    const formToShow = document.getElementById(formId);
    if (formToShow) {
        formToShow.style.display = 'block';
        console.log("Form displayed:", formId);
    } else {
        console.error("Form not found:", formId);
    }
};

// Add a global test function we can call from console
window.testFirestore = async function() {
    try {
        console.log("Manual test: Creating test document in Firestore");
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: "Test from manual function"
        };
        
        // Import needed Firestore functions
        const { collection, doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js");
        const { db } = await import("./firebase.js");
        
        // Create test document
        const testRef = doc(collection(db, "manual_test"), "test_doc");
        await setDoc(testRef, testData);
        console.log("Manual test: Successfully created test document");
        
        return "Test successful";
    } catch (error) {
        console.error("Manual test failed:", error);
        return {error: error.message};
    }
};

// Add function to show login form
window.showLoginForm = function() {
    console.log("Showing login form");
    // Hide all forms first
    document.getElementById("signup-form").style.display = 'none';
    document.getElementById("reset-password-form").style.display = 'none';
    document.getElementById("user-profile").style.display = 'none';
    
    // Show login form
    const loginContainer = document.getElementById("login-container");
    if (loginContainer) {
        loginContainer.style.display = 'block';
        console.log("Login form displayed");
    } else {
        console.error("Login container not found");
    }
};

// Add a direct test for registered_users collection
window.testRegUsers = async function() {
    try {
        console.log("Testing users collection directly");
        
        // Import needed Firestore functions
        const { collection, doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js");
        const { db } = await import("./firebase.js");
        
        // Create a test ID
        const testId = "manual-test-" + Date.now();
        
        // Create test data
        const testData = {
            email: "direct-test@example.com",
            licensePlates: ["TEST-PLATE"],
            created: new Date().toISOString(),
            uid: testId
        };
        
        // Create document in users collection (not registered_users)
        const docRef = doc(db, "users", testId);
        await setDoc(docRef, testData);
        console.log("Direct test: Successfully created document in users collection!");
        
        return "Direct test successful";
    } catch (error) {
        console.error("Direct test failed:", error);
        return {error: error.message};
    }
};

console.log("Added window.testFirestore() and window.testRegUsers() functions - call these from console to test");

import { 
    collection,
    doc, 
    setDoc, 
    getDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { db, auth } from './firebase.js';

// Utility function for license plate validation
function isValidLicensePlate(plate) {
    if (!plate) return false;
    plate = plate.trim().toUpperCase();
    if (plate.length < 2 || plate.length > 8) return false;
    return /^[A-Z0-9-]+$/.test(plate);
}

console.log("Imports completed");

// Add debugging logging for basic Firestore and Auth objects
console.log("Firestore db object type:", typeof db);
console.log("Auth object type:", typeof auth);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Setting up event listeners");

    // Get all form elements once
    const elements = {
        // Login elements
        loginForm: document.getElementById("login-form"),
        loginEmail: document.getElementById("login-email"),
        loginPassword: document.getElementById("login-password"),
        loginError: document.getElementById("login-error-message"),
        loginBtn: document.getElementById("Login"),

        // Signup elements
        signupForm: document.getElementById("signup-form"),
        email: document.getElementById("email"),
        password: document.getElementById("password"),
        license: document.getElementById("license"),
        signupBtn: document.getElementById("Signup"),
        errorElement: document.getElementById("error"),
        successMessage: document.getElementById('successMessage'),

        // Navigation buttons
        needAccountBtn: document.getElementById('need-an-account-btn'),
        haveAccountBtn: document.getElementById('have-an-account-btn'),
        forgotPasswordBtn: document.getElementById('forgot-password-btn'),
        backToLoginBtn: document.getElementById('back-to-login'),

        // Forms
        resetPasswordForm: document.getElementById("reset-password-form"),
        resetPasswordEmail: document.getElementById("reset-password-email"),
        resetPasswordBtn: document.getElementById("reset-password-btn"),
        resetPasswordMessage: document.getElementById("rp-message")
    };

    // Log found elements
    console.log("Elements found:", Object.entries(elements).reduce((acc, [key, value]) => {
        acc[key] = !!value;
        return acc;
    }, {}));

    // Handle Login
    async function handleLogin(e) {
        e.preventDefault();
        console.log("Login attempt started");

        // Disable button and show loading state
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="spinner loading icon"></i> Logging in...';
        
        try {
            const email = elements.loginEmail.value.trim();
            const password = elements.loginPassword.value;

            if (!email || !password) {
                throw new Error("Please enter both email and password");
            }

            console.log("Attempting to sign in with email:", email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Login successful, user:", userCredential.user.uid);

            // Show success state
            elements.loginBtn.innerHTML = '<i class="check icon"></i> Success!';
            elements.loginError.style.display = 'none';

            // Redirect to dashboard
            console.log("Redirecting to dashboard...");
            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Login error:", error);
            
            // Show error message
            let message = "Login failed. Please check your email and password.";
            if (error.code === 'auth/user-not-found') message = "No account found with this email";
            if (error.code === 'auth/wrong-password') message = "Incorrect password";
            if (error.code === 'auth/invalid-email') message = "Invalid email address";

            elements.loginError.textContent = message;
            elements.loginError.style.display = 'block';

            // Reset button state
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<i class="sign-in icon"></i> Login';
        }
    }

    // Add event listeners
    if (elements.loginForm) {
        elements.loginForm.addEventListener("submit", handleLogin);
    }

    // Form navigation
    if (elements.needAccountBtn) {
        elements.needAccountBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.showForm("signup-form");
        });
    }

    if (elements.haveAccountBtn) {
        elements.haveAccountBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.showForm("login-container");
        });
    }

    if (elements.forgotPasswordBtn) {
        elements.forgotPasswordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.showForm("reset-password-form");
        });
    }

    if (elements.backToLoginBtn) {
        elements.backToLoginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.showForm("login-container");
        });
    }

    // Reset Password Handler
    if (elements.resetPasswordBtn) {
        elements.resetPasswordBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const email = elements.resetPasswordEmail.value.trim();
            
            try {
                await sendPasswordResetEmail(auth, email);
                elements.resetPasswordMessage.textContent = "Password reset email sent! Check your inbox.";
                elements.resetPasswordMessage.classList.remove("hidden", "error");
                elements.resetPasswordMessage.classList.add("success");
            } catch (error) {
                elements.resetPasswordMessage.textContent = error.message;
                elements.resetPasswordMessage.classList.remove("hidden", "success");
                elements.resetPasswordMessage.classList.add("error");
            }
        });
    }

    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User is already logged in:", user.uid);
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'dashboard.html';
            }
        } else {
            console.log("No user currently logged in");
        }
    });

    // Show login form by default
    window.showForm("login-container");
});