import RPi.GPIO as GPIO
import time
import subprocess  # This will help us run the Node.js script

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 17 as input with pull-up resistor
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Proximity Sensor Test Started")
print("Press Ctrl+C to exit")

# Variables to track camera state and timing
camera_running = False
last_trigger_time = 0
COOLDOWN_PERIOD = 10  # 30 seconds cooldown after successful detection
INITIAL_DELAY = 3  # 3 seconds initial delay before starting camera
MIN_TRIGGER_DURATION = 3  # Minimum time sensor must be triggered to count as valid

try:
    while True:
        # Read the sensor value
        if GPIO.input(17) == GPIO.LOW:  # Object detected
            trigger_start_time = time.time()
            
            # Wait to see if the trigger is sustained
            time.sleep(MIN_TRIGGER_DURATION)
            
            # Check if still triggered and enough time has passed since last trigger
            if (GPIO.input(17) == GPIO.LOW and 
                not camera_running and 
                (time.time() - last_trigger_time) >= COOLDOWN_PERIOD):
                
                print("📦 Vehicle Detected!")
                print("⏳ Waiting 3 seconds before starting camera...")
                time.sleep(INITIAL_DELAY)  # Wait 3 seconds before starting camera
                
                print("📸 Starting camera...")
                # Start the Node.js script
                subprocess.Popen(['node', 'start-camera.js'])
                camera_running = True
                last_trigger_time = time.time()
                
                # Wait for 30 seconds before allowing next trigger
                # Wait for response from start-camera.js
                try:
                    # Start monitoring for license plate detection
                    process = subprocess.Popen(['node', 'start-camera.js'], stdout=subprocess.PIPE)
                    
                    # Wait up to 30 seconds for license plate detection
                    process.wait(timeout=30)
                    
                    # If we get here, a license plate was detected successfully
                    print("✅ License plate detected - waiting 30 seconds before next vehicle")
                    time.sleep(30)  # 30 second cooldown after successful detection
                    
                except subprocess.TimeoutExpired:
                    # If no license plate detected within timeout
                    print("⚠️ No valid license plate detected - resetting after 3 seconds") 
                    time.sleep(3)  # Short 3 second reset if no valid detection
                    
                camera_running = False
        else:
            print("⭕ No Vehicle Detected")
        
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 Stopping sensor test...")
finally:
    # Clean up GPIO settings
    GPIO.cleanup()