const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the auth-webapp directory
app.use(express.static(path.join(__dirname, 'auth-webapp')));

// Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n=== Frontend Server Started ===');
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`College access: http://192.168.90.127:${PORT}`);
    console.log(`Home access: http://192.168.0.123:${PORT}`);
    console.log('===================\n');
}); 