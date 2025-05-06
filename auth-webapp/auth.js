// Get Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication state handler
function handleAuthState() {
    const publicPages = ['index.html', 'register.html', 'forgot-password.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    console.log('🔒 Checking auth state for:', currentPage);
    
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 User is signed in:', user.email);
                
                // If on a public page, redirect to dashboard
                if (publicPages.includes(currentPage)) {
                    console.log('📱 Redirecting to dashboard...');
                    window.location.replace('dashboard.html');
                }
                resolve(user);
            } else {
                console.log('❌ No user signed in');
                
                // If not on a public page, redirect to login
                if (!publicPages.includes(currentPage)) {
                    console.log('🔒 Redirecting to login...');
                    window.location.replace('index.html');
                }
                resolve(null);
            }
        });
    });
}

// Initialize authentication handling
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await handleAuthState();
        if (user) {
            console.log('Authentication initialized with user:', user.email);
        } else {
            console.log('Authentication initialized with no user');
        }
    } catch (error) {
        console.error('Error initializing authentication:', error);
    }
}); 