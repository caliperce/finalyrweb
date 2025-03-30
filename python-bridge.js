const { spawn } = require('child_process');

console.log('🔍 Starting Proximity Sensor Test via Python Bridge');

// Spawn the Python process
// Make sure the path to your Python script is correct
const pythonProcess = spawn('python3', ['test_sensor.py']);

// Handle Python script output
pythonProcess.stdout.on('data', (data) => {
  // Forward the Python output to Node.js console
  console.log(data.toString().trim());
});

// Handle Python script errors
pythonProcess.stderr.on('data', (data) => {
  console.error(`Python Error: ${data}`);
});

// Handle process termination
pythonProcess.on('close', (code) => {
  console.log(`Python process exited with code ${code}`);
});

// Clean up on Node.js exit
process.on('SIGINT', () => {
  pythonProcess.kill();
  console.log('\n🛑 Stopping sensor test...');
  process.exit();
});