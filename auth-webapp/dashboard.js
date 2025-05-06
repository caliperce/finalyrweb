// Check if we're on the dashboard page
if (window.location.pathname.includes('dashboard')) {
    // Add authentication check
    auth.onAuthStateChanged((user) => {
        if (!user) {
            console.log('🔒 No authenticated user found, redirecting to login...');
            window.location.replace('index.html');
            return;
        }
    });
}

// Wait for Firebase to initialize
let firebaseInitialized = false;
let authInitialized = false;

// Get Firebase instances after initialization
let auth;
let db;

// DOM Elements
let userEmailElement;
let licensePlateList;
let addLicenseForm;
let newLicensePlateInput;
let addLicenseBtn;
let licenseError;
let logoutBtn;
let activeParkingList;
let noActiveParkingElement;
let parkingLoadingElement;
let parkingErrorElement;
let parkingErrorMessageElement;
let pendingPaymentsSection;
let pendingPaymentsList;
let paymentModal;
let markAsPaidButton;
let cancelPaymentButton;

// Variable to store the current parking ID for payment
let currentPaymentParkingId = null;

// Store timer interval IDs for cleanup
const timerIntervals = {};

function initializeFirebase() {
    return new Promise((resolve) => {
        if (firebaseInitialized) {
            resolve();
            return;
        }
        
        const checkFirebase = setInterval(() => {
            if (firebase.apps.length) {
                clearInterval(checkFirebase);
                firebaseInitialized = true;
                resolve();
            }
        }, 100);
    });
}

async function initializeApp() {
    if (authInitialized) return;
    
    await initializeFirebase();
    auth = firebase.auth();
    db = firebase.firestore();
    authInitialized = true;
    console.log('Firebase services initialized');
}

function initializeDOMElements() {
    userEmailElement = document.getElementById('user-email');
    licensePlateList = document.getElementById('license-plate-list');
    addLicenseForm = document.getElementById('add-license-form');
    newLicensePlateInput = document.getElementById('new-license-plate');
    addLicenseBtn = document.getElementById('add-license-btn');
    licenseError = document.getElementById('license-error');
    logoutBtn = document.getElementById('Logout');
    activeParkingList = document.getElementById('active-parking-list');
    noActiveParkingElement = document.getElementById('no-active-parking');
    parkingLoadingElement = document.getElementById('parking-loading');
    parkingErrorElement = document.getElementById('parking-error');
    parkingErrorMessageElement = document.getElementById('parking-error-message');
    pendingPaymentsSection = document.getElementById('pending-payments-section');
    pendingPaymentsList = document.getElementById('pending-payments-list');
    paymentModal = document.getElementById('payment-modal');
    markAsPaidButton = document.getElementById('mark-as-paid-button');
    cancelPaymentButton = document.getElementById('cancel-payment-button');
}

// Server Configuration
const SERVER_CONFIG = {
    LOCATION_1: 'http://192.168.90.127:3001',
    LOCATION_2: 'http://192.168.0.123:3001',
    VERCEL: 'https://finalyrweb.vercel.app.vercel.app' // Add your Vercel URL here
};

// Function to get the current server URL from localStorage or default
function getCurrentServerURL() {
    return localStorage.getItem('SERVER_URL') || SERVER_CONFIG.LOCATION_2;
}

// Function to switch server URL
function switchServerURL(location) {
    localStorage.setItem('SERVER_URL', SERVER_CONFIG[location]);
    console.log('🔄 Switched server URL to:', SERVER_CONFIG[location]);
    // Reload the page to apply changes
    window.location.reload();
}

// Use the server URL from localStorage
const SERVER_URL = getCurrentServerURL();

// Log the server URL for debugging
console.log('🌐 Using server URL:', SERVER_URL);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard loaded, initializing...');
    
    try {
        await initializeApp();
        initializeDOMElements();
        
        // Check authentication state only once
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user?.email);
            
            if (!user) {
                console.log('No user found, redirecting to login...');
                window.location.replace('index.html');
                return;
            }

            // Display user email
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
                console.log('Updated user email display:', user.email);
            }

            // Load user data only once
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log('User data loaded:', userData);
                    updateUI(userData);
                    
                    // Initialize Firebase listener for parking updates
                    setupParkingListener();
                } else {
                    console.log('No user document found');
                    // Create new user document if it doesn't exist
                    await db.collection('users').doc(user.uid).set({
                        email: user.email,
                        licensePlates: [],
                        createdAt: new Date().toISOString(),
                        uid: user.uid
                    });
                    console.log('Created new user document');
                    updateUI({ licensePlates: [] });
                }
                
                // Unsubscribe from the auth state listener after initial load
                unsubscribe();
            } catch (error) {
                console.error('Error loading user data:', error);
                showNotification('Error loading user data', 'error');
            }
        });

        // Logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.replace('index.html');
                } catch (error) {
                    console.error('Error signing out:', error);
                    showNotification('Error signing out', 'error');
                }
            });
        }

        // Add license plate functionality
        if (addLicenseBtn && addLicenseForm) {
            addLicenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const plate = newLicensePlateInput.value.trim().toUpperCase();
                
                if (!plate) {
                    showError('Please enter a license plate number');
                    return;
                }
                
                try {
                    await addLicensePlate(plate);
                    newLicensePlateInput.value = '';
                    showNotification('License plate added successfully', 'success');
                } catch (error) {
                    console.error('Error adding license plate:', error);
                    showError(error.message);
                }
            });
        }

        // Set up payment modal buttons
        if (markAsPaidButton) {
            markAsPaidButton.addEventListener('click', async () => {
                if (!currentPaymentParkingId) {
                    console.error('No parking ID found for payment');
                    showNotification('Error processing payment', 'error');
                    return;
                }
                
                // Add loading state to button
                markAsPaidButton.classList.add('loading');
                markAsPaidButton.disabled = true;
                
                // Process the payment
                const success = await processPayment(currentPaymentParkingId);
                
                // Reset button state
                markAsPaidButton.classList.remove('loading');
                markAsPaidButton.disabled = false;
                
                if (success) {
                    // Close the modal
                    $(paymentModal).modal('hide');
                    // Show success notification
                    showNotification('Payment successful', 'success');
                    // Reset current parking ID
                    currentPaymentParkingId = null;
                }
            });
        }
        
        if (cancelPaymentButton) {
            cancelPaymentButton.addEventListener('click', () => {
                // Close the modal
                $(paymentModal).modal('hide');
                // Reset current parking ID
                currentPaymentParkingId = null;
            });
        }

        // Initialize server location dropdown
        const serverLocationSelect = document.getElementById('server-location');
        if (serverLocationSelect) {
            // Set initial value based on current server
            const currentURL = getCurrentServerURL();
            for (const [key, value] of Object.entries(SERVER_CONFIG)) {
                if (value === currentURL) {
                    serverLocationSelect.value = key;
                    break;
                }
            }

            // Add change event listener
            serverLocationSelect.addEventListener('change', (e) => {
                const newLocation = e.target.value;
                switchServerURL(newLocation);
            });
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error initializing dashboard', 'error');
    }
});

// Function to update UI with user data
function updateUI(userData) {
    console.log('Updating UI with user data:', userData);
    
    // Clear existing list
    if (licensePlateList) {
        licensePlateList.innerHTML = '';
    }

    // Display license plates
    if (userData.licensePlates && Array.isArray(userData.licensePlates)) {
        userData.licensePlates.forEach((plate, index) => {
            const plateElement = document.createElement('div');
            plateElement.className = 'plate-item';
            plateElement.innerHTML = `
                <div class="plate-number">
                    <i class="car icon"></i>
                    ${plate}
                </div>
                <button class="ui red icon button delete-plate" data-index="${index}">
                    <i class="trash icon"></i>
                </button>
            `;
            licensePlateList.appendChild(plateElement);
        });

        // Add delete button event listeners
        document.querySelectorAll('.delete-plate').forEach(button => {
            button.addEventListener('click', () => deleteLicensePlate(parseInt(button.dataset.index)));
        });

        // Update add button state
        if (addLicenseBtn) {
            addLicenseBtn.disabled = userData.licensePlates.length >= 3;
            if (userData.licensePlates.length >= 3) {
                addLicenseBtn.classList.add('disabled');
            } else {
                addLicenseBtn.classList.remove('disabled');
            }
        }
    }
}

// Function to add license plate
async function addLicensePlate(plate) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // Create new user document
            await userRef.set({
                email: user.email,
                licensePlates: [plate],
                createdAt: new Date().toISOString(),
                uid: user.uid
            });
            console.log('Created new user document with license plate');
        } else {
            // Update existing document
            const currentPlates = userDoc.data().licensePlates || [];
            if (currentPlates.length >= 3) {
                throw new Error('Maximum number of license plates (3) reached');
            }
            if (currentPlates.includes(plate)) {
                throw new Error('This license plate is already registered');
            }
            await userRef.update({
                licensePlates: [...currentPlates, plate]
            });
        }

        // Refresh UI
        const updatedDoc = await userRef.get();
        updateUI(updatedDoc.data());
        
        // Clear input
        if (newLicensePlateInput) {
            newLicensePlateInput.value = '';
        }
        
        // Hide error
        if (licenseError) {
            licenseError.style.display = 'none';
        }
    } catch (error) {
        console.error('Error adding license plate:', error);
        if (licenseError) {
            licenseError.textContent = error.message;
            licenseError.style.display = 'block';
        }
    }
}

// Function to delete license plate
async function deleteLicensePlate(index) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        const currentPlates = userDoc.data().licensePlates || [];
        
        const newPlates = currentPlates.filter((_, i) => i !== index);
        await userRef.update({
            licensePlates: newPlates
        });

        // Refresh UI
        const updatedDoc = await userRef.get();
        updateUI(updatedDoc.data());
    } catch (error) {
        console.error('Error deleting license plate:', error);
        if (licenseError) {
            licenseError.textContent = 'Failed to delete license plate';
            licenseError.style.display = 'block';
        }
    }
}

// Function to check if a license plate exists in users collection
async function checkLicensePlate(licensePlate) {
    try {
        console.log('🔍 Checking license plate in users collection:', licensePlate);
        // Query the users collection for the license plate
        const usersRef = db.collection('users');
        const q = usersRef.where('licensePlates', 'array-contains', licensePlate);
        const querySnapshot = await q.get();
        
        const exists = !querySnapshot.empty;
        console.log('License plate exists:', exists);
        return exists;
    } catch (error) {
        console.error('Error checking license plate:', error);
        return false;
    }
}

// Function to create active parking entry
async function createActiveParkingEntry(licensePlate, timestamp, imageUrl) {
    try {
        console.log('📝 Creating active parking entry for:', licensePlate);
        
        // Validate license plate format
        if (!licensePlate || typeof licensePlate !== 'string' || licensePlate.trim() === '') {
            console.error('❌ Invalid license plate format:', licensePlate);
            showNotification('Invalid license plate format', 'error');
            return false;
        }
        
        // Validate timestamp
        let parsedTimestamp;
        try {
            parsedTimestamp = new Date(timestamp);
            if (!(parsedTimestamp instanceof Date && !isNaN(parsedTimestamp))) {
                throw new Error('Invalid date');
            }
        } catch (e) {
            console.error('❌ Invalid timestamp format:', timestamp);
            showNotification('Invalid timestamp format', 'error');
            return false;
        }
        
        // Check if entry already exists for this license plate
        const activeParkingRef = db.collection('active_parking');
        const q = activeParkingRef.where('licensePlate', '==', licensePlate).where('status', '==', 'active');
        
        const existingEntries = await q.get();
        if (!existingEntries.empty) {
            console.log('⚠️ Active entry already exists for license plate:', licensePlate);
            showNotification(`License plate ${licensePlate} already has an active parking entry`, 'warning');
            return true;
        }
        
        // Create a new document in active_parking collection with image URL
        const newParkingDoc = {
            licensePlate: licensePlate,
            entryTimestamp: timestamp,
            status: 'active',
            createdAt: new Date().toISOString(),
            entryImageUrl: imageUrl || null,  // Store entry image URL
            exitImageUrl: null  // Initialize exit image URL as null
        };
        
        const docRef = await activeParkingRef.add(newParkingDoc);
        console.log('✅ Created new active parking entry with ID:', docRef.id);
        
        showNotification(`New parking entry created for ${licensePlate}`, 'success');
        return true;
    } catch (error) {
        console.error('Error creating active parking entry:', error);
        showNotification('Failed to create parking entry', 'error');
        return false;
    }
}

// Function to handle new parking entry
async function handleNewParkingEntry(licensePlate, timestamp) {
    try {
        console.log('🚗 Processing new parking entry:', { licensePlate, timestamp });
        // First check if the license plate exists in users collection
        const exists = await checkLicensePlate(licensePlate);
        
        if (exists) {
            // If it exists, create an active parking entry
            const success = await createActiveParkingEntry(licensePlate, timestamp);
            if (success) {
                console.log('✅ Successfully processed parking entry');
                showNotification('New parking entry recorded', 'success');
            } else {
                console.log('❌ Failed to create parking entry');
                showNotification('Failed to record parking entry', 'error');
            }
        } else {
            console.log('❌ License plate not found in users collection');
            showNotification('License plate not registered', 'warning');
        }
    } catch (error) {
        console.error('Error handling parking entry:', error);
        showNotification('Error processing parking entry', 'error');
    }
}

// Function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `ui ${type} message notification`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '300px';
    
    notification.innerHTML = `
        <i class="close icon"></i>
        <div class="header">${message}</div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Add close button functionality
    notification.querySelector('.close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 5000);
}

// Function to set up real-time listeners for parking updates
function setupParkingListener() {
    console.log('🔄 Setting up Firebase real-time listeners...');
    
    const user = auth.currentUser;
    if (!user) {
        console.log('❌ No user logged in');
        return;
    }

    // Get user's license plates
    db.collection('users').doc(user.uid).get().then(userDoc => {
        const userLicensePlates = userDoc.data()?.licensePlates || [];
        console.log('📋 Watching for updates on plates:', userLicensePlates);

        if (userLicensePlates.length === 0) {
            console.log('❌ No registered plates to watch');
            noActiveParkingElement.style.display = 'block';
            return;
        }

        // Show loading state
        parkingLoadingElement.style.display = 'block';
        noActiveParkingElement.style.display = 'none';

        // Set up real-time listener for active_parking collection
        const unsubscribe = db.collection('active_parking')
            .where('licensePlate', 'in', userLicensePlates)
            .onSnapshot(snapshot => {
                console.log(`📊 Received update from Firebase. Changes: ${snapshot.docChanges().length}`);
                
                // Hide loading state
                parkingLoadingElement.style.display = 'none';
                
                // Process the changes
                snapshot.docChanges().forEach(change => {
                    const data = change.doc.data();
                    console.log(`🔄 Document ${change.type}:`, data);
                    
                    // If this is a new exit (status changed to pending_payment)
                    if (change.type === 'modified' && data.status === 'pending_payment') {
                        showNotification(`Vehicle ${data.licensePlate} has exited. Payment required.`, 'warning');
                    }
                });

                // Get all documents and organize them by status
                const entries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Separate active and pending payment entries
                const activeEntries = entries.filter(entry => entry.status === 'active');
                const pendingEntries = entries.filter(entry => entry.status === 'pending_payment');

                // Update UI for active entries
                console.log(`📋 Active entries: ${activeEntries.length}`);
                if (activeEntries.length === 0 && pendingEntries.length === 0) {
                    noActiveParkingElement.style.display = 'block';
                } else {
                    noActiveParkingElement.style.display = 'none';
                }
                renderActiveParkingEntries(activeEntries);

                // Update UI for pending payments
                console.log(`💰 Pending payments: ${pendingEntries.length}`);
                if (pendingEntries.length > 0) {
                    pendingPaymentsSection.style.display = 'block';
                    renderPendingPayments(pendingEntries);
                } else {
                    pendingPaymentsSection.style.display = 'none';
                }
            }, error => {
                console.error('❌ Error in Firebase listener:', error);
                parkingLoadingElement.style.display = 'none';
                parkingErrorElement.style.display = 'block';
                parkingErrorMessageElement.textContent = 'Error monitoring parking updates: ' + error.message;
                showNotification('Error monitoring parking updates', 'error');
            });

        // Clean up listener on page unload
        window.addEventListener('beforeunload', () => {
            console.log('🧹 Cleaning up Firebase listeners...');
            unsubscribe();
        });
    }).catch(error => {
        console.error('❌ Error getting user data:', error);
        parkingLoadingElement.style.display = 'none';
        parkingErrorElement.style.display = 'block';
        parkingErrorMessageElement.textContent = 'Error setting up parking monitor: ' + error.message;
        showNotification('Error setting up parking monitor', 'error');
    });
}

// Helper function to render pending payments
function renderPendingPayments(pendingEntries) {
    if (!pendingPaymentsList) return;
    
    pendingPaymentsList.innerHTML = '';
    
    pendingEntries.forEach(entry => {
        const element = document.createElement('div');
        element.className = 'ui segment';
        element.style.borderLeft = '4px solid #f39c12';
        element.style.background = 'rgba(255, 255, 255, 0.7)';
        element.innerHTML = `
            <div class="ui grid">
                <div class="ten wide column">
                    <div class="ui orange text" style="font-weight: bold;">${entry.licensePlate}</div>
                    <div>Duration: ${entry.parkingDuration}</div>
                    <div>Fee: $${entry.parkingFee.toFixed(2)}</div>
                </div>
                <div class="six wide column" style="display: flex; align-items: center; justify-content: flex-end;">
                    <button class="ui orange button pay-button" data-id="${entry.id}">
                        <i class="credit card icon"></i>
                        Pay Now
                    </button>
                </div>
            </div>
        `;
        
        pendingPaymentsList.appendChild(element);
        
        // Add click handler for pay button
        const payButton = element.querySelector('.pay-button');
        payButton.addEventListener('click', () => {
            currentPaymentParkingId = entry.id;
            $(paymentModal).modal('show');
        });
    });
}

// Function to process payment
async function processPayment(parkingId) {
    try {
        console.log('💵 Processing payment for parking ID:', parkingId);
        
        // In a real application, this would connect to a payment gateway
        // For this demo, we'll just update the document
        
        await db.collection('active_parking').doc(parkingId).update({
            hasPaid: true,
            status: 'completed',
            paymentTimestamp: new Date().toISOString()
        });
        
        console.log('✅ Payment processed successfully');
        showNotification('Payment processed successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Failed to process payment', 'error');
        return false;
    }
} 