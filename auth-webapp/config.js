// Configuration for backend URLs
const config = {
    // Detect environment and set appropriate backend URL
    BACKEND_URL: window.location.hostname.includes('github.io') 
        ? 'http://192.168.90.127:3001'  // When hosted on GitHub Pages, use college IP
        : window.location.hostname === '192.168.0.123'
            ? 'http://192.168.0.123:3001'  // When accessed from home
            : 'http://192.168.90.127:3001', // Default to college IP

    // Test if we're in the college environment
    isCollege: () => window.location.hostname === '192.168.90.127',
    
    // Test if we're in the home environment
    isHome: () => window.location.hostname === '192.168.0.123'
};

export default config; 