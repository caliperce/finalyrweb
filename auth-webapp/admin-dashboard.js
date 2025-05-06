import { db } from './firebase.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Server Configuration
const SERVER_CONFIG = {
    LOCATION_1: 'http://192.168.90.127:3001',
    LOCATION_2: 'http://192.168.0.123:3001'
};

// Use the appropriate server URL based on your location
const SERVER_URL = SERVER_CONFIG.LOCATION_2; // Using LOCATION_2 since it's responding

console.log('🔄 Initializing admin dashboard...');
console.log('🌐 Using server URL:', SERVER_URL);

// Function to fetch latest images for a license plate
async function fetchLatestImages(licensePlate) {
    try {
        console.log(`🔍 Fetching images for license plate: ${licensePlate}`);
        
        // Query Firebase for the latest parking entry
        const parkingRef = db.collection('active_parking');
        const query = parkingRef
            .where('licensePlate', '==', licensePlate)
            .orderBy('entryTimestamp', 'desc')
            .limit(1);
            
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            console.log('❌ No parking entries found for:', licensePlate);
            return { entryImageUrl: '', exitImageUrl: '' };
        }
        
        const parkingData = snapshot.docs[0].data();
        console.log('📸 Image URLs from Firebase:', {
            entry: parkingData.entryImageUrl,
            exit: parkingData.exitImageUrl
        });
        
        return {
            entryImageUrl: parkingData.entryImageUrl || '',
            exitImageUrl: parkingData.exitImageUrl || ''
        };
    } catch (error) {
        console.error('❌ Error fetching images from Firebase:', error);
        return { entryImageUrl: '', exitImageUrl: '' };
    }
}

// Function to update parking entry images
async function updateParkingImages(parkingId, { entryImageUrl, exitImageUrl }) {
    try {
        const updates = {};
        if (entryImageUrl) updates.entryImageUrl = entryImageUrl;
        if (exitImageUrl) updates.exitImageUrl = exitImageUrl;
        
        if (Object.keys(updates).length > 0) {
            await db.collection('active_parking').doc(parkingId).update(updates);
            console.log('✅ Updated image URLs for parking entry:', parkingId);
        }
    } catch (error) {
        console.error('❌ Error updating parking images:', error);
    }
}

// Function to format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Function to create a parking record card
async function createParkingCard(parkingData, docId) {
    const card = document.createElement('div');
    card.className = 'ui card parking-card';
    card.id = `parking-card-${docId}`;
    
    // Fetch latest images from server
    const imageUrls = await fetchLatestImages(parkingData.licensePlate);
    
    card.innerHTML = `
        <div class="content">
            <div class="header">License Plate: ${parkingData.licensePlate}</div>
            <div class="meta">
                <span class="status ${parkingData.status}">Status: ${parkingData.status}</span>
            </div>
            <div class="description">
                <p><strong>Entry Time:</strong> ${formatDate(parkingData.entryTimestamp)}</p>
                <p><strong>Exit Time:</strong> ${formatDate(parkingData.exitTimestamp)}</p>
                <p><strong>Duration:</strong> ${parkingData.parkingDuration || 'N/A'}</p>
                <p><strong>Fee:</strong> $${parkingData.parkingFee?.toFixed(2) || '0.00'}</p>
            </div>
        </div>
        <div class="extra content">
            <div class="ui two buttons">
                <button class="ui basic green button view-entry-image" data-url="${imageUrls.entryImageUrl}">
                    <i class="camera icon"></i> View Entry Image
                </button>
                <button class="ui basic blue button view-exit-image" data-url="${imageUrls.exitImageUrl}">
                    <i class="camera icon"></i> View Exit Image
                </button>
            </div>
        </div>
    `;

    // Add event listeners for image buttons
    const entryImageBtn = card.querySelector('.view-entry-image');
    const exitImageBtn = card.querySelector('.view-exit-image');

    entryImageBtn.addEventListener('click', async () => {
        const url = entryImageBtn.dataset.url;
        if (url) {
            showImageModal('Entry Image', url);
        } else {
            // Try to fetch latest image
            const latestImages = await fetchLatestImages(parkingData.licensePlate);
            if (latestImages.entryImageUrl) {
                showImageModal('Entry Image', latestImages.entryImageUrl);
            } else {
                showNotification('No entry image available', 'warning');
            }
        }
    });

    exitImageBtn.addEventListener('click', async () => {
        const url = exitImageBtn.dataset.url;
        if (url) {
            showImageModal('Exit Image', url);
        } else {
            // Try to fetch latest image
            const latestImages = await fetchLatestImages(parkingData.licensePlate);
            if (latestImages.exitImageUrl) {
                showImageModal('Exit Image', latestImages.exitImageUrl);
            } else {
                showNotification('No exit image available', 'warning');
            }
        }
    });

    return card;
}

// Function to show image in a modal
function showImageModal(title, imageUrl) {
    let modal = document.getElementById('image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'ui modal';
        modal.innerHTML = `
            <i class="close icon"></i>
            <div class="header">${title}</div>
            <div class="image content">
                <div class="ui active loader" id="modal-loader"></div>
                <img class="ui fluid image" src="${imageUrl}" alt="${title}" style="display: none;"
                     onload="this.style.display='block'; document.getElementById('modal-loader').style.display='none';"
                     onerror="showNotification('Failed to load image', 'error'); $('.ui.modal').modal('hide');">
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.querySelector('.header').textContent = title;
        const img = modal.querySelector('img');
        const loader = modal.querySelector('#modal-loader');
        loader.style.display = 'block';
        img.style.display = 'none';
        img.src = imageUrl;
    }

    $(modal).modal('show');
}

// Function to show notification
function showNotification(message, type = 'info') {
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
    
    document.body.appendChild(notification);
    
    // Add close button functionality
    notification.querySelector('.close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 3000);
}

// Function to load parking records
function loadParkingRecords() {
    try {
        console.log('📝 Loading parking records...');
        const parkingRecordsContainer = document.getElementById('parking-records');
        parkingRecordsContainer.innerHTML = '<div class="ui active centered inline loader"></div>';

        // Set up real-time listener for parking records
        const parkingRef = collection(db, 'active_parking');
        const q = query(parkingRef, orderBy('entryTimestamp', 'desc'));
        
        console.log('🔄 Setting up real-time listener...');
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            console.log(`📥 Received ${querySnapshot.docs.length} parking records`);
            parkingRecordsContainer.innerHTML = '';

            if (querySnapshot.empty) {
                console.log('ℹ️ No parking records found');
                parkingRecordsContainer.innerHTML = '<div class="ui info message">No parking records found</div>';
                return;
            }

            // Process documents sequentially to maintain order
            for (const doc of querySnapshot.docs) {
                const parkingData = doc.data();
                console.log(`📋 Processing parking record: ${doc.id}`, parkingData);
                const card = await createParkingCard(parkingData, doc.id);
                parkingRecordsContainer.appendChild(card);
            }

            // Initialize search functionality after first load
            if (!window.searchInitialized) {
                initializeSearch();
                window.searchInitialized = true;
            }
        }, (error) => {
            console.error('❌ Error in real-time listener:', error);
            parkingRecordsContainer.innerHTML = 
                '<div class="ui negative message">Error loading parking records</div>';
        });

        // Clean up listener when page is unloaded
        window.addEventListener('beforeunload', () => {
            console.log('🧹 Cleaning up real-time listener...');
            unsubscribe();
        });

    } catch (error) {
        console.error('❌ Error setting up real-time listener:', error);
        document.getElementById('parking-records').innerHTML = 
            '<div class="ui negative message">Error loading parking records</div>';
    }
}

// Function to initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.ui.search input');
    const parkingRecordsContainer = document.getElementById('parking-records');

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = parkingRecordsContainer.querySelectorAll('.ui.card');
        
        cards.forEach(card => {
            const licensePlate = card.querySelector('.header').textContent.toLowerCase();
            if (licensePlate.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Add some CSS for status colors
const style = document.createElement('style');
style.textContent = `
    .status.active { color: #21ba45; }
    .status.pending_payment { color: #f2711c; }
    .status.completed { color: #2185d0; }
`;
document.head.appendChild(style);

// Load parking records when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Starting admin dashboard...');
    loadParkingRecords();
}); 