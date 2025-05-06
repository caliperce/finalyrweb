// Get Firebase instances from the global scope
const auth = firebase.auth();
const db = firebase.firestore();

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

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded, checking auth state...');
    
    // Initialize polling systems
    setupParkingListener();
    setupExitListener();
    
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
    
    // Get DOM elements
    const userEmailElement = document.getElementById('user-email');
    const licensePlateList = document.getElementById('license-plate-list');
    const addLicenseForm = document.getElementById('add-license-form');
    const newLicensePlateInput = document.getElementById('new-license-plate');
    const addLicenseBtn = document.getElementById('add-license-btn');
    const licenseError = document.getElementById('license-error');
    const logoutBtn = document.getElementById('Logout');
    const activeParkingList = document.getElementById('active-parking-list');
    const noActiveParkingElement = document.getElementById('no-active-parking');
    const parkingLoadingElement = document.getElementById('parking-loading');
    const parkingErrorElement = document.getElementById('parking-error');
    const parkingErrorMessageElement = document.getElementById('parking-error-message');
    const pendingPaymentsSection = document.getElementById('pending-payments-section');
    const pendingPaymentsList = document.getElementById('pending-payments-list');
    const paymentModal = document.getElementById('payment-modal');
    const markAsPaidButton = document.getElementById('mark-as-paid-button');
    const cancelPaymentButton = document.getElementById('cancel-payment-button');
    
    // Variable to store the current parking ID for payment
    let currentPaymentParkingId = null;
    
    // Store timer interval IDs for cleanup
    const timerIntervals = {};
    
    // Set up modal buttons
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
    
    cancelPaymentButton.addEventListener('click', () => {
        // Close the modal
        $(paymentModal).modal('hide');
        // Reset current parking ID
        currentPaymentParkingId = null;
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

    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user?.email);
        
        if (!user) {
            console.log('No user found, redirecting to login...');
            window.location.replace('index.html');
            return;
        }

        // Display user email
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
            console.log('Updated user email display');
        }

        // Load user data
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('User data loaded:', userData);
                updateUI(userData);
            } else {
                console.log('No user document found');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    });

    // Add license plate event listener
    if (addLicenseBtn) {
        addLicenseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const plate = newLicensePlateInput.value.trim().toUpperCase();
            if (!plate) {
                licenseError.textContent = 'Please enter a license plate number';
                licenseError.style.display = 'block';
                return;
            }
            addLicensePlate(plate);
        });
    }

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

    // Function to check and collect phone number
    async function checkAndCollectPhoneNumber(user) {
        try {
            // Get user document
            const userDocRef = db.collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            if (!userDoc.exists) {
                console.error("User document not found");
                return;
            }
            
            const userData = userDoc.data();
            
            // If phone number doesn't exist, show the modal
            if (!userData.phoneNumber) {
                // Show the modal
                $('#phone-number-modal').modal({
                    closable: false,
                    onDeny: function() {
                        return false; // Prevent closing
                    }
                }).modal('show');
                
                // Set up save button handler
                const savePhoneBtn = document.getElementById('save-phone-btn');
                const phoneInput = document.getElementById('phone-number-input');
                const phoneError = document.getElementById('phone-error');
                
                savePhoneBtn.addEventListener('click', async () => {
                    const phoneNumber = phoneInput.value.trim();
                    
                    // Validate phone number
                    if (!phoneNumber || !phoneNumber.startsWith('+')) {
                        phoneError.textContent = 'Please enter a valid phone number with country code (e.g., +919962973049)';
                        phoneError.style.display = 'block';
                        return;
                    }
                    
                    try {
                        // Update user document with phone number
                        await userDocRef.update({
                            phoneNumber: phoneNumber
                        });
                        
                        // Hide modal and clear error
                        $('#phone-number-modal').modal('hide');
                        phoneError.style.display = 'none';
                        
                        // Show success notification
                        showNotification('Phone number saved successfully!', 'success');
                    } catch (error) {
                        console.error('Error saving phone number:', error);
                        phoneError.textContent = 'Failed to save phone number. Please try again.';
                        phoneError.style.display = 'block';
                    }
                });
            }
        } catch (error) {
            console.error('Error checking phone number:', error);
        }
    }

    // Load and display user's license plates
    async function loadLicensePlates() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Get user document reference
            const userDocRef = db.collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            // If the user document doesn't exist, create it
            if (!userDoc.exists) {
                console.log("User document doesn't exist, creating it now...");
                try {
                    // Create a new user document
                    await userDocRef.set({
                        email: user.email,
                        licensePlates: [],
                        createdAt: new Date().toISOString(),
                        uid: user.uid
                    });
                    console.log("Successfully created new user document");
                    
                    // Reload the document after creating it
                    const refreshedDoc = await userDocRef.get();
                    var licensePlates = refreshedDoc.data()?.licensePlates || [];
                } catch (error) {
                    console.error("Error creating user document:", error);
                    showError("Failed to create user profile");
                    return;
                }
            } else {
                // Document exists, get license plates
                var licensePlates = userDoc.data()?.licensePlates || [];
            }
            
            // Clear existing list
            licensePlateList.innerHTML = '';

            // Display each license plate
            licensePlates.forEach((plate, index) => {
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

            // Update add button state
            addLicenseBtn.disabled = licensePlates.length >= 3;
            if (licensePlates.length >= 3) {
                addLicenseBtn.classList.add('disabled');
            } else {
                addLicenseBtn.classList.remove('disabled');
            }

            // Add delete button event listeners
            document.querySelectorAll('.delete-plate').forEach(button => {
                button.addEventListener('click', () => deleteLicensePlate(parseInt(button.dataset.index)));
            });
        } catch (error) {
            showError('Error loading license plates');
            console.error('Error loading license plates:', error);
        }
    }

    // Event Listeners
    addLicenseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const plate = newLicensePlateInput.value.trim().toUpperCase();
        
        if (!plate) {
            showError('Please enter a license plate number');
            return;
        }
        
        addLicensePlate(plate);
    });

    // Logout functionality
    logoutBtn.addEventListener('click', async () => {
        try {
            // First navigate to index.html
            window.location.href = 'index.html';
            // Then sign out
            await auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });

    // Function to start monitoring active parking entries
    function setupActiveParkingMonitor() {
        const user = auth.currentUser;
        if (!user) return;
        
        console.log('🔄 Setting up active parking monitor...');
        
        // Show loading state
        showParkingLoadingState();
        
        // Get all user's license plates
        const loadUserLicensePlates = async () => {
            const userDoc = await db.collection('users').doc(user.uid).get();
            return userDoc.data()?.licensePlates || [];
        };
        
        // Function to monitor active parking entries
        const monitorActiveParkingEntries = async () => {
            try {
                // Get user's license plates
                const licensePlates = await loadUserLicensePlates();
                
                if (licensePlates.length === 0) {
                    console.log('No license plates found for user');
                    hideParkingLoadingState();
                    noActiveParkingElement.style.display = 'block';
                    return;
                }
                
                console.log('Monitoring active parking for license plates:', licensePlates);
                
                // Create a query for all user's parking entries (active, pending payment, and completed)
                const activeParkingRef = db.collection('active_parking');
                const q = db.collection('active_parking').where('licensePlate', 'in', licensePlates);
                
                // Set up real-time listener
                return db.collection('active_parking').onSnapshot(snapshot => {
                    hideParkingLoadingState();
                    console.log(`Active parking snapshot received: ${snapshot.docs.length} entries`);
                    
                    // Clear previous timer intervals
                    Object.values(timerIntervals).forEach(interval => clearInterval(interval));
                    Object.keys(timerIntervals).forEach(key => delete timerIntervals[key]);
                    
                    // Validate the data before rendering
                    const validEntries = validateParkingEntries(snapshot.docs);
                    
                    // Update UI with valid entries
                    renderActiveParkingEntries(validEntries);
                }, (error) => {
                    hideParkingLoadingState();
                    console.error('Error in active parking snapshot:', error);
                    showParkingError('Error monitoring active parking: ' + error.message);
                });
            } catch (error) {
                hideParkingLoadingState();
                console.error('Error setting up active parking monitor:', error);
                showParkingError('Failed to monitor active parking: ' + error.message);
            }
        };
        
        // Start monitoring
        const unsubscribe = monitorActiveParkingEntries();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
    }
    
    // Function to validate parking entries from Firebase
    function validateParkingEntries(entries) {
        if (!entries || !Array.isArray(entries)) {
            console.error('Invalid entries data:', entries);
            return [];
        }
        
        return entries.filter(entry => {
            try {
                const data = entry.data();
                
                // Check if required fields exist and are valid
                if (!data) {
                    console.error('Entry has no data', entry.id);
                    return false;
                }
                
                if (!data.licensePlate) {
                    console.error('Entry missing license plate', entry.id);
                    return false;
                }
                
                if (!data.entryTimestamp) {
                    console.error('Entry missing timestamp', entry.id);
                    return false;
                }
                
                // Validate that timestamp is a valid date
                const entryTime = new Date(data.entryTimestamp);
                if (!(entryTime instanceof Date && !isNaN(entryTime))) {
                    console.error('Entry has invalid timestamp', data.entryTimestamp);
                    return false;
                }
                
                // Validate status - accept all valid status values
                const validStatuses = ['active', 'pending_payment', 'completed'];
                if (!data.status || !validStatuses.includes(data.status)) {
                    console.error('Entry has invalid status', data.status);
                    return false;
                }
                
                // For entries with exitTimestamp, validate it
                if (data.exitTimestamp) {
                    const exitTime = new Date(data.exitTimestamp);
                    if (!(exitTime instanceof Date && !isNaN(exitTime))) {
                        console.error('Entry has invalid exit timestamp', data.exitTimestamp);
                        return false;
                    }
                }
                
                return true;
            } catch (error) {
                console.error('Error validating entry:', error);
                return false;
            }
        });
    }
    
    // Show loading state for parking data
    function showParkingLoadingState() {
        noActiveParkingElement.style.display = 'none';
        parkingErrorElement.style.display = 'none';
        parkingLoadingElement.style.display = 'block';
    }
    
    // Hide loading state for parking data
    function hideParkingLoadingState() {
        parkingLoadingElement.style.display = 'none';
    }
    
    // Show error message for parking data
    function showParkingError(message) {
        parkingErrorMessageElement.textContent = message;
        parkingErrorElement.style.display = 'block';
        noActiveParkingElement.style.display = 'none';
    }
    
    // Render active parking entries with timers
    function renderActiveParkingEntries(entries) {
        console.log('Rendering active parking entries:', entries.length);
        
        if (!entries || entries.length === 0) {
            noActiveParkingElement.style.display = 'block';
            activeParkingList.innerHTML = '';
            activeParkingList.appendChild(noActiveParkingElement);
            pendingPaymentsSection.style.display = 'none';
            pendingPaymentsList.innerHTML = '';
            return;
        }
        
        noActiveParkingElement.style.display = 'none';
        activeParkingList.innerHTML = '';
        pendingPaymentsList.innerHTML = '';
        
        // Filter entries: Only show active and pending_payment entries in the main display
        // Completed (paid) entries will be hidden as requested
        const displayableEntries = entries.filter(entry => entry.data().status !== 'completed');
        
        // Show "no active parking" if all entries are completed
        if (displayableEntries.length === 0) {
            noActiveParkingElement.style.display = 'block';
            activeParkingList.appendChild(noActiveParkingElement);
            pendingPaymentsSection.style.display = 'none';
            return;
        }
        
        // Sort entries: payment required first, then active
        const sortedEntries = [...displayableEntries].sort((a, b) => {
            const statusA = a.data().status;
            const statusB = b.data().status;
            
            // Order: 1. pending_payment, 2. active
            if (statusA === 'pending_payment' && statusB !== 'pending_payment') return -1;
            if (statusA !== 'pending_payment' && statusB === 'pending_payment') return 1;
            
            return 0;
        });
        
        // Filter entries for pending payments
        const pendingPaymentEntries = sortedEntries.filter(entry => entry.data().status === 'pending_payment');
        
        // Show or hide pending payments section
        if (pendingPaymentEntries.length > 0) {
            pendingPaymentsSection.style.display = 'block';
            
            // Render pending payment entries
            pendingPaymentEntries.forEach(entry => {
                try {
                    const data = entry.data();
                    const entryId = entry.id;
                    const entryTime = new Date(data.entryTimestamp);
                    const exitTime = new Date(data.exitTimestamp);
                    
                    const formattedEntryTime = entryTime.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const formattedExitTime = exitTime.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const pendingPaymentElement = document.createElement('div');
                    pendingPaymentElement.className = 'ui segment';
                    pendingPaymentElement.style.borderLeft = '4px solid #f39c12';
                    pendingPaymentElement.style.background = 'rgba(255, 255, 255, 0.7)';
                    pendingPaymentElement.style.marginBottom = '15px';
                    
                    pendingPaymentElement.innerHTML = `
                        <div class="ui grid">
                            <div class="ten wide column">
                                <div class="ui orange text" style="font-weight: bold;">${data.licensePlate}</div>
                                <div>Entry: ${formattedEntryTime} • Exit: ${formattedExitTime}</div>
                                <div>Duration: ${data.parkingDuration} • Fee: $${data.parkingFee.toFixed(2)}</div>
                            </div>
                            <div class="six wide column" style="display: flex; align-items: center; justify-content: flex-end;">
                                <button class="ui orange button pay-button" data-id="${entryId}">
                                    <i class="credit card icon"></i>
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    `;
                    
                    pendingPaymentsList.appendChild(pendingPaymentElement);
                    
                    // Add event listener for payment button
                    const payButton = pendingPaymentElement.querySelector('.pay-button');
                    payButton.addEventListener('click', async () => {
                        const parkingId = payButton.getAttribute('data-id');
                        
                        // Store the parking ID for payment processing
                        currentPaymentParkingId = parkingId;
                        
                        // Open the payment modal
                        $(paymentModal).modal('show');
                    });
                } catch (error) {
                    console.error('Error rendering pending payment entry:', error);
                }
            });
        } else {
            pendingPaymentsSection.style.display = 'none';
        }
        
        // Render all entries in the main list
        sortedEntries.forEach(entry => {
            try {
                const data = entry.data();
                const entryId = entry.id;
                const entryTime = new Date(data.entryTimestamp);
                const formattedEntryTime = entryTime.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                // Create base entry element
                const entryElement = document.createElement('div');
                entryElement.className = 'ui segment active-parking-item';
                
                // Different UI based on status
                if (data.status === 'pending_payment') {
                    // Payment required UI
                    const exitTime = new Date(data.exitTimestamp);
                    const formattedExitTime = exitTime.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    entryElement.style.borderLeft = '4px solid #f39c12';
                    entryElement.innerHTML = `
                        <div class="ui orange ribbon label">
                            <i class="money bill alternate icon"></i> Payment Required
                        </div>
                        <div class="ui grid" style="margin-top: 1.5rem;">
                            <div class="twelve wide column">
                                <h3 class="ui header">
                                    <i class="car icon"></i>
                                        <div class="content">
                                        ${data.licensePlate}
                                        <div class="sub header">Entry: ${formattedEntryTime}</div>
                                        <div class="sub header">Exit: ${formattedExitTime}</div>
                                        <div class="sub header">Duration: ${data.parkingDuration}</div>
                                        <div class="sub header">Fee: $${data.parkingFee.toFixed(2)}</div>
                                        <div class="sub header" id="status-${entryId}">Status: <span class="ui orange text">Awaiting Payment</span></div>
                                    </div>
                                </h3>
                            </div>
                            <div class="four wide column" style="display: flex; align-items: center; justify-content: center;">
                                <button class="ui orange button pay-button" data-id="${entryId}">
                                    <i class="credit card icon"></i>
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    `;
                } else if (data.status === 'completed') {
                    // Completed parking UI
                    const exitTime = new Date(data.exitTimestamp);
                    const formattedExitTime = exitTime.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    entryElement.style.borderLeft = '4px solid #27ae60';
                    entryElement.innerHTML = `
                        <div class="ui green ribbon label">
                            <i class="check circle icon"></i> Completed
                        </div>
                        <div class="ui grid" style="margin-top: 1.5rem;">
                            <div class="twelve wide column">
                                <h3 class="ui header">
                                    <i class="car icon"></i>
                                    <div class="content">
                                        ${data.licensePlate}
                                        <div class="sub header">Entry: ${formattedEntryTime}</div>
                                        <div class="sub header">Exit: ${formattedExitTime}</div>
                                        <div class="sub header">Duration: ${data.parkingDuration}</div>
                                        <div class="sub header">Fee: $${data.parkingFee.toFixed(2)}</div>
                                        <div class="sub header" id="status-${entryId}">Status: <span class="ui green text">Paid & Completed</span></div>
                                    </div>
                                </h3>
                            </div>
                            <div class="four wide column" style="display: flex; align-items: center; justify-content: center;">
                                <div class="ui green label">
                                    <i class="check icon"></i> Paid
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Active parking UI (default)
                    entryElement.innerHTML = `
                        <div class="ui ribbon label" style="background-color: #27ae60; color: white;">
                            <i class="check circle icon"></i> Verified
                        </div>
                        <div class="ui grid" style="margin-top: 1.5rem;">
                            <div class="twelve wide column">
                                <h3 class="ui header">
                                    <i class="car icon"></i>
                                    <div class="content">
                                        ${data.licensePlate}
                                        <div class="sub header">Entry: ${formattedEntryTime}</div>
                                        <div class="sub header" id="status-${entryId}">Status: <span class="ui green text">${data.status}</span></div>
                                    </div>
                                </h3>
                            </div>
                            <div class="four wide column">
                                <div class="ui statistic">
                                    <div class="value" id="timer-${entryId}">Calculating...</div>
                                    <div class="label">Duration</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                activeParkingList.appendChild(entryElement);
                
                // Add event listener for payment button if it exists
                const payButton = entryElement.querySelector('.pay-button');
                if (payButton) {
                    payButton.addEventListener('click', async () => {
                        const parkingId = payButton.getAttribute('data-id');
                        
                        // Store the parking ID for payment processing
                        currentPaymentParkingId = parkingId;
                        
                        // Open the payment modal
                        $(paymentModal).modal('show');
                    });
                }
                
                // Only set up timer for active entries
                if (data.status === 'active') {
                    // Add error handling for the timer
                    try {
                        // Set up timer after verification
                        startTimer(entryId, entryTime);
                    } catch (timerError) {
                        console.error('Error starting timer:', timerError);
                        const timerElement = document.getElementById(`timer-${entryId}`);
                        if (timerElement) {
                            timerElement.textContent = 'Error';
                            timerElement.style.color = 'red';
                        }
                    }
                }
            } catch (renderError) {
                console.error('Error rendering parking entry:', renderError);
            }
        });
    }
    
    // Start timer for a parking entry
    function startTimer(entryId, startTime) {
        const timerElement = document.getElementById(`timer-${entryId}`);
        if (!timerElement) return;
        
        // Function to update timer display
        const updateTimer = () => {
            try {
                const now = new Date();
                const duration = now - startTime;
                
                // Format duration as HH:MM:SS
                const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
                const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
                const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
                
                // Update the timer text
                timerElement.textContent = `${hours}:${minutes}:${seconds}`;
                
                // Change color based on duration
                if (hours >= 1) {
                    timerElement.style.color = '#e74c3c'; // Red for over an hour
                } else if (minutes >= 30) {
                    timerElement.style.color = '#f39c12'; // Orange for over 30 minutes
                } else {
                    timerElement.style.color = '#27ae60'; // Green for under 30 minutes
                }
            } catch (error) {
                console.error('Error updating timer:', error);
                timerElement.textContent = 'Error';
                timerElement.style.color = 'red';
                // Clear this interval to prevent further errors
                if (timerIntervals[entryId]) {
                    clearInterval(timerIntervals[entryId]);
                    delete timerIntervals[entryId];
                }
            }
        };
        
        // Update timer immediately
        updateTimer();
        
        // Set interval to update timer every second
        timerIntervals[entryId] = setInterval(updateTimer, 1000);
    }
});

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

// Function to poll for new entries
async function pollForNewEntries() {
    try {
        console.log('🔄 Polling for new entries...');
        console.log('🌐 Using server URL:', SERVER_URL);
        
        // Get the current user
        const user = auth.currentUser;
        if (!user) {
            console.log('❌ No user logged in');
            return;
        }

        // Get user's license plates
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userLicensePlates = userDoc.data()?.licensePlates || [];
        console.log('📋 User license plates:', userLicensePlates);

        if (userLicensePlates.length === 0) {
            console.log('❌ User has no registered license plates');
            return;
        }

        // Add cache-busting parameter
        const timestamp = new Date().getTime();
        console.log('🔍 Fetching latest entry from:', `${SERVER_URL}/latest-entry?v=${timestamp}`);
        const response = await fetch(`${SERVER_URL}/latest-entry?v=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Received response:', result);
        
        // If we have new data and it hasn't been processed yet
        if (result.success && result.data && result.data.licensePlate) {
            const currentEntry = result.data;
            console.log('📋 Current entry:', currentEntry);
            
            // Check if this license plate belongs to the user
            if (!userLicensePlates.includes(currentEntry.licensePlate)) {
                console.log('⚠️ License plate not registered to current user:', currentEntry.licensePlate);
                return;
            }
            
            // Get the last 5 minutes of entries to avoid duplicates
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentEntriesQuery = await db.collection('active_parking')
                .where('licensePlate', '==', currentEntry.licensePlate)
                .where('entryTimestamp', '>', fiveMinutesAgo.toISOString())
                .get();

            if (recentEntriesQuery.empty) {
                console.log('🆕 New valid entry detected:', currentEntry);
                await handleNewParkingEntry(currentEntry.licensePlate, currentEntry.timestamp);
                showNotification(`New parking entry detected for ${currentEntry.licensePlate}`, 'success');
                
                // Force refresh the UI
                const activeParkingRef = db.collection('active_parking');
                const snapshot = await activeParkingRef
                    .where('licensePlate', 'in', userLicensePlates)
                    .get();
                const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderActiveParkingEntries(entries);
            } else {
                console.log('⏭️ Recent entry already exists, skipping...');
            }
        } else {
            console.log('ℹ️ No new entries to process');
        }
    } catch (error) {
        console.error('❌ Error polling for new entries:', error);
        showNotification('Error checking for new entries', 'error');
    }
}

// Set up polling interval with immediate first call
function setupParkingListener() {
    console.log('🔄 Setting up parking entry listener...');
    // Poll immediately
    pollForNewEntries();
    // Then set up interval
    setInterval(pollForNewEntries, 5000);
    console.log('✅ Polling system initialized');
    showNotification('Parking detection system started', 'info');
}

// Set up polling interval for exits
function setupExitListener() {
    console.log('🔄 Setting up exit detection listener...');
    // Initialize the last processed exit timestamp
    window.lastProcessedExitTimestamp = null;
    // Poll every 5 seconds
    setInterval(pollForExits, 5000);
    console.log('✅ Exit polling system initialized');
    
    // Show initial notification
    showNotification('Exit detection system started', 'info');
}

// Function to poll for vehicle exits
async function pollForExits() {
    try {
        console.log('🔄 Polling for vehicle exits...');
        console.log('🌐 Using server URL:', SERVER_URL);
        const timestamp = new Date().getTime();
        const response = await fetch(`${SERVER_URL}/latest-exit?v=${timestamp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('📥 Received exit response:', result);
        
        // If we have new exit data and it hasn't been processed yet
        if (result.success && result.data && result.data.licensePlate) {
            // Validate the data from the server
            const currentExit = result.data;
            console.log('📋 Current exit:', currentExit);
            
            // Validate essential fields
            if (!currentExit.licensePlate || !currentExit.exitTimestamp) {
                console.error('❌ Invalid exit data - missing required fields:', currentExit);
                return;
            }
            
            // Validate timestamp format
            const exitTime = new Date(currentExit.exitTimestamp);
            if (!(exitTime instanceof Date && !isNaN(exitTime))) {
                console.error('❌ Invalid exit timestamp:', currentExit.exitTimestamp);
                return;
            }
            
            console.log('🕒 Last processed exit timestamp:', window.lastProcessedExitTimestamp);
            
            // Only process if we haven't seen this exit before
            if (!window.lastProcessedExitTimestamp || window.lastProcessedExitTimestamp !== currentExit.exitTimestamp) {
                console.log('🆕 New valid exit detected:', currentExit);
                // Get the image URL from the response
                const exitImageUrl = currentExit.imageUrl;
                console.log('🖼️ Exit image URL:', exitImageUrl);
                
                await handleVehicleExit(currentExit.licensePlate, currentExit.exitTimestamp, exitImageUrl);
                // Update the last processed exit timestamp
                window.lastProcessedExitTimestamp = currentExit.exitTimestamp;
                console.log('✅ Updated last processed exit timestamp to:', currentExit.exitTimestamp);
            } else {
                console.log('⏭️ Exit already processed, skipping...');
            }
        } else {
            console.log('ℹ️ No new exits to process');
        }
    } catch (error) {
        console.error('❌ Error polling for exits:', error);
    }
}

// Function to handle vehicle exit
async function handleVehicleExit(licensePlate, exitTimestamp, exitImageUrl) {
    try {
        console.log('🚗 Processing vehicle exit:', { licensePlate, exitTimestamp });
        
        // Find active parking entry for this license plate
        const activeParkingRef = db.collection('active_parking');
        const q = activeParkingRef.where('licensePlate', '==', licensePlate).where('status', '==', 'active');
        
        const querySnapshot = await q.get();
        
        if (querySnapshot.empty) {
            console.log('❌ No active parking found for license plate:', licensePlate);
            showNotification(`No active parking found for ${licensePlate}`, 'warning');
            return false;
        }
        
        // Get the existing parking document
        const parkingDoc = querySnapshot.docs[0];
        const parkingData = parkingDoc.data();
        const parkingId = parkingDoc.id;
        
        // Keep the existing entry image URL
        const entryImageUrl = parkingData.entryImageUrl;
        
        console.log('📝 Updating parking entry:', parkingId);
        console.log('🖼️ Image URLs:', { entry: entryImageUrl, exit: exitImageUrl });
        
        // Calculate parking duration
        const entryTime = new Date(parkingData.entryTimestamp);
        const exitTime = new Date(exitTimestamp);
        const durationMs = exitTime - entryTime;
        
        // Convert to hours, minutes, seconds
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Calculate parking fee (example: $2 per hour, minimum 1 hour)
        const hourlyRate = 2;
        const billableHours = Math.max(1, Math.ceil(durationMs / 3600000));
        const parkingFee = billableHours * hourlyRate;
        
        await db.collection('active_parking').doc(parkingId).update({
            exitTimestamp: exitTimestamp,
            hasPaid: false,
            status: 'pending_payment',
            parkingDuration: formattedDuration,
            parkingDurationMs: durationMs,
            parkingFee: parkingFee,
            entryImageUrl: entryImageUrl,  // Preserve the entry image URL
            exitImageUrl: exitImageUrl || null  // Add the exit image URL
        });
        
        console.log('✅ Successfully updated parking entry with exit information');
        showNotification(`Vehicle ${licensePlate} has exited. Payment required.`, 'warning');
        
        return true;
    } catch (error) {
        console.error('Error handling vehicle exit:', error);
        showNotification('Error processing vehicle exit', 'error');
        return false;
    }
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