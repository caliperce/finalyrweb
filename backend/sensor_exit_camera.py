import RPi.GPIO as GPIO
import time
import subprocess
import os

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 27 as input with pull-up resistor for exit sensor
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Exit Proximity Sensor Test Started")
print("Press Ctrl+C to exit")

# Variables to track camera state and timing
camera_running = False
last_trigger_time = 0
COOLDOWN_PERIOD = 10  # 10 seconds cooldown after successful detection
INITIAL_DELAY = 3  # 3 seconds initial delay before starting camera
MIN_TRIGGER_DURATION = 3  # 3 seconds minimum trigger duration
TRIGGER_COUNT = 0  # Count consecutive triggers
REQUIRED_TRIGGERS = 3  # Number of consecutive triggers needed

# Get the absolute path to the script
script_dir = os.path.dirname(os.path.abspath(__file__))
exit_camera_script = os.path.join(script_dir, 'start-exit-camera.js')

try:
    while True:
        # Read the sensor value
        if GPIO.input(27) == GPIO.LOW:  # Object detected
            trigger_start_time = time.time()
            
            # Wait to see if the trigger is sustained
            time.sleep(MIN_TRIGGER_DURATION)
            
            # Check if still triggered and enough time has passed since last trigger
            if (GPIO.input(27) == GPIO.LOW and 
                not camera_running and 
                (time.time() - last_trigger_time) >= COOLDOWN_PERIOD):
                
                TRIGGER_COUNT += 1
                print(f"📦 Vehicle Detected at Exit! (Trigger count: {TRIGGER_COUNT})")
                
                # Only trigger if we've seen enough consecutive triggers
                if TRIGGER_COUNT >= REQUIRED_TRIGGERS:
                    print("⏳ Waiting 3 seconds before starting camera...")
                    time.sleep(INITIAL_DELAY)  # Wait 3 seconds before starting camera
                    
                    print("📸 Starting exit camera...")
                    print(f"Running script: {exit_camera_script}")
                    
                    try:
                        # Start the Node.js script for exit camera
                        process = subprocess.Popen(['node', exit_camera_script], 
                                                stdout=subprocess.PIPE,
                                                stderr=subprocess.PIPE)
                        print("✅ Node.js script started successfully")
                        
                        camera_running = True
                        last_trigger_time = time.time()
                        TRIGGER_COUNT = 0  # Reset trigger count
                        
                        # Wait for response from start-exit-camera.js
                        try:
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
                    except Exception as e:
                        print(f"❌ Error starting camera: {str(e)}")
                        camera_running = False
            else:
                TRIGGER_COUNT = 0  # Reset if trigger is not sustained
        else:
            TRIGGER_COUNT = 0  # Reset if no trigger
            print("⭕ No Vehicle Detected at Exit")
        
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 Stopping exit sensor test...")
finally:
    # Clean up GPIO settings
    GPIO.cleanup() 