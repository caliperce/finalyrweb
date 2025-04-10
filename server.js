const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the auth-webapp directory
app.use(express.static(path.join(__dirname, 'auth-webapp')));

// Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://192.168.90.127:${PORT}`);
    console.log('You can access the payment page at: http://192.168.90.127:3000/index.html');
}); 