import RPi.GPIO as GPIO
import time
import subprocess  # This will help us run the Node.js script

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 27 as input with pull-up resistor for exit sensor
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Exit Proximity Sensor Test Started")
print("Press Ctrl+C to exit")

# Variable to track if camera is already running
camera_running = False

try:
    while True:
        # Read the sensor value
        if GPIO.input(27) == GPIO.LOW:  # Object detected
            print("📦 Vehicle Detected at Exit!")
            if not camera_running:
                print("📸 Starting exit camera...")
                # Start the Node.js script for exit camera
                subprocess.Popen(['node', 'start-exit-camera.js'])
                camera_running = True
                # Wait for 10 seconds before allowing next trigger
                time.sleep(10)
                camera_running = False
        else:
            print("⭕ No Vehicle Detected at Exit")
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 Stopping exit sensor test...")
finally:
    # Clean up GPIO settings
    GPIO.cleanup() 