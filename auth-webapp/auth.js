// Get Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication state handler
function handleAuthState() {
    const publicPages = ['index.html', 'register.html', 'forgot-password.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    console.log('🔒 Checking auth state for:', currentPage);
    
    return new Promise((resolve) => {
        let redirectInProgress = false;
        
        auth.onAuthStateChanged((user) => {
            if (redirectInProgress) return;
            
            if (user) {
                console.log('👤 User is signed in:', user.email);
                
                // If on a public page, redirect to dashboard
                if (publicPages.includes(currentPage)) {
                    console.log('📱 Redirecting to dashboard...');
                    redirectInProgress = true;
                    setTimeout(() => {
                        window.location.replace('dashboard.html');
                    }, 1000);
                }
                resolve(user);
            } else {
                console.log('❌ No user signed in');
                
                // If not on a public page, redirect to login
                if (!publicPages.includes(currentPage) && currentPage !== '') {
                    console.log('🔒 Redirecting to login...');
                    redirectInProgress = true;
                    setTimeout(() => {
                        window.location.replace('index.html');
                    }, 1000);
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