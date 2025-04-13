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
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, fetchSignInMethodsForEmail} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { db, auth } from './firebase.js';

// Remove the problematic import and add the function directly here
function isValidLicensePlate(plate) {
    // Basic license plate validation
    if (!plate) return false;
    plate = plate.trim().toUpperCase();
    // Check if plate has at least 2 characters and no more than 8
    if (plate.length < 2 || plate.length > 8) return false;
    // Check if plate contains only letters, numbers, and hyphens
    return /^[A-Z0-9-]+$/.test(plate);
}

console.log("Imports completed");

// Add debugging logging for basic Firestore and Auth objects
console.log("Firestore db object type:", typeof db);
console.log("Auth object type:", typeof auth);

// Wrap the main code in try-catch to catch any errors
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Content Loaded - START");
        
        try {
            // Show login form by default
            showForm("login-container");
            
            // Get form elements
            const loginForm = document.getElementById("login-form");
            const loginBtn = document.getElementById("Login");
            
            console.log("Critical elements found:", {
                loginForm: !!loginForm,
                loginBtn: !!loginBtn
            });

            // Basic click handler for testing
            if (loginBtn) {
                loginBtn.onclick = function(e) {
                    console.log("Login button clicked - basic handler");
                    e.preventDefault();
                };
            }

            // Rest of your existing code...

            // Get form elements
            const signupForm = document.getElementById("signup-form");
            const resetPasswordForm = document.getElementById("reset-password-form");
            const successMessage = document.getElementById('successMessage');
            
            // Get form navigation buttons
            const needAccountBtn = document.getElementById('need-an-account-btn');
            const haveAccountBtn = document.getElementById('have-an-account-btn');
            const forgotPasswordBtn = document.getElementById('forgot-password-btn');
            const backToLoginBtn = document.getElementById('back-to-login');
            
            // Signup form elements
            const email = document.getElementById("email");
            const password = document.getElementById("password");
            const license = document.getElementById("license");
            const signupBtn = document.getElementById("Signup");
            const errorElement = document.getElementById("error");
            
            // Login form elements
            const loginEmail = document.getElementById("login-email");
            const loginPassword = document.getElementById("login-password");
            const loginError = document.getElementById('login-error-message');
            
            console.log("Form elements found:", {
                loginForm: !!loginForm,
                loginBtn: !!loginBtn,
                loginEmail: !!loginEmail,
                loginPassword: !!loginPassword,
                loginError: !!loginError
            });
            
            // Function to handle login
            async function handleLogin(e) {
                e.preventDefault(); // Prevent form from submitting normally
                console.log("Login attempt started");
                
                // Get the input values and UI elements we need
                const email = loginEmail.value.trim();
                const password = loginPassword.value;
                
                // First check if email and password were entered
                if (!email || !password) {
                    console.log("Missing email or password");
                    if (loginError) {
                        loginError.innerHTML = "Please enter both email and password";
                        loginError.classList.add('visible');
                    }
                    return;
                }
                
                try {
                    // Show loading state
                    loginBtn.disabled = true;
                    loginBtn.innerHTML = '<i class="spinner loading icon"></i> Logging in...';
                    console.log("Attempting to sign in with email:", email);
                    
                    // Try to log in with Firebase
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    console.log("Login successful, user:", userCredential.user.uid);
                    
                    // If successful, show success and redirect
                    loginBtn.innerHTML = '<i class="check icon"></i> Success! Redirecting...';
                    loginError.innerHTML = "";
                    loginError.classList.remove('visible');
                    
                    // Wait a moment before redirecting
                    setTimeout(() => {
                        console.log("Redirecting to dashboard...");
                        window.location.href = "dashboard.html";
                    }, 1000);
                    
                } catch (error) {
                    console.error("Login error:", error);
                    console.error("Error code:", error.code);
                    console.error("Error message:", error.message);
                    
                    // If there's an error, show a friendly message
                    let message = "Login failed. Please check your email and password.";
                    
                    if (error.code === 'auth/user-not-found') {
                        message = "No account found with this email";
                    } else if (error.code === 'auth/wrong-password') {
                        message = "Incorrect password";
                    } else if (error.code === 'auth/invalid-email') {
                        message = "Invalid email address";
                    }
                    
                    if (loginError) {
                        loginError.innerHTML = message;
                        loginError.classList.add('visible');
                    }
                    
                    // Reset the button
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = 'Login';
                }
            }

            // Set up event listeners for the login form and button
            if (loginForm) {
                console.log("Adding submit event listener to login form");
                // Remove the old event listener if it exists
                loginForm.removeEventListener("submit", handleLogin);
                // Add the new event listener
                loginForm.addEventListener("submit", function(e) {
                    console.log("Login form submitted!");
                    e.preventDefault(); // Prevent default form submission
                    handleLogin(e);
                });
            } else {
                console.error("Login form not found");
            }

            if (loginBtn) {
                console.log("Adding click event listener to login button");
                // Remove the old event listener if it exists
                loginBtn.removeEventListener("click", handleLogin);
                // Add the new event listener
                loginBtn.addEventListener("click", function(e) {
                    console.log("Login button clicked!");
                    e.preventDefault(); // Prevent default button behavior
                    handleLogin(e);
                });
            } else {
                console.error("Login button not found");
            }

            // Check if user is already logged in
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log("User is already logged in:", user.uid);
                    // If logged in and on login page, go to dashboard
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    console.log("No user currently logged in");
                }
            });

            // Show login form by default
            showForm("login-container");
            
            // Add event listeners for form navigation
            if (needAccountBtn) {
                needAccountBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("Need account button clicked");
                    window.showForm("signup-form");
                });
            }
            
            if (haveAccountBtn) {
                haveAccountBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("Have account button clicked");
                    window.showForm("login-container");
                });
            }
            
            if (forgotPasswordBtn) {
                forgotPasswordBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("Forgot password button clicked");
                    window.showForm("reset-password-form");
                });
            }
            
            if (backToLoginBtn) {
                backToLoginBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("Back to login button clicked");
                    window.showForm("login-container");
                });
            }
            
            // Add direct signup handler
            if (signupBtn) {
                console.log("Adding click handler to signup button");
                signupBtn.addEventListener("click", async function(e) {
                    e.preventDefault();
                    console.log("=== SIMPLIFIED SIGNUP FUNCTION ===");
                    
                    // Clear any error messages
                    if (errorElement) {
                        errorElement.innerHTML = "";
                        errorElement.classList.remove("visible");
                    }
                    
                    // Basic form validation
                    if (!email || !email.value || !password || !password.value || !license || !license.value) {
                        console.log("Missing required fields");
                        if (errorElement) {
                            errorElement.innerHTML = "All fields are required";
                            errorElement.classList.add("visible");
                        }
                        return;
                    }
                    
                    // Get form values
                    const userEmail = email.value.trim();
                    const userPassword = password.value;
                    const userLicense = license.value.trim().toUpperCase();
                    
                    console.log("Form data:", { email: userEmail, license: userLicense });
                    
                    try {
                        // STEP 1: Create the authentication user
                        console.log("Creating Firebase Auth user...");
                        const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
                        const user = userCredential.user;
                        console.log("Auth user created:", user.uid);
                        
                        // STEP 2: Create user data object that EXACTLY matches your existing structure
                        const currentTime = new Date().toISOString();
                        const userData = {
                            createdAt: currentTime,
                            email: userEmail,
                            licensePlates: [userLicense],
                            uid: user.uid
                        };
                        
                        console.log("User data prepared:", userData);
                        
                        // STEP 3: Write to Firestore using the SIMPLEST possible approach
                        console.log("Writing to Firestore users collection...");
                        
                        try {
                            // Create document reference with user's UID as the document ID
                            const userRef = doc(db, "users", user.uid);
                            
                            // Set the document data
                            await setDoc(userRef, userData);
                            console.log("User document created successfully!");
                            
                            // Show success message
                            if (successMessage) {
                                successMessage.style.display = 'block';
                                successMessage.innerHTML = "Account created successfully! Redirecting...";
                            }
                            
                            // Redirect after a short delay
                            setTimeout(() => {
                                window.location.href = "dashboard.html";
                            }, 2000);
                        } catch (firestoreError) {
                            // Log any Firestore errors
                            console.error("FIRESTORE ERROR:", firestoreError);
                            console.error("Code:", firestoreError.code);
                            console.error("Message:", firestoreError.message);
                            
                            // Show error to user
                            if (errorElement) {
                                errorElement.innerHTML = "Error saving your information: " + firestoreError.message;
                                errorElement.classList.add("visible");
                            }
                        }
                    } catch (authError) {
                        // Handle authentication errors
                        console.error("AUTH ERROR:", authError);
                        console.error("Code:", authError.code);
                        console.error("Message:", authError.message);
                        
                        // Show error to user
                        if (errorElement) {
                            errorElement.innerHTML = authError.message;
                            errorElement.classList.add("visible");
                        }
                    }
                });
            }
        } catch (error) {
            console.error("DOM Content Loaded error:", error);
        }
    });
} catch (error) {
    console.error("Main code error:", error);
}