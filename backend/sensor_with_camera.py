import RPi.GPIO as GPIO
import time
import subprocess  # This will help us run the Node.js script

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 17 as input with pull-up resistor
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Proximity Sensor Test Started")
print("Press Ctrl+C to exit")

# Variable to track if camera is already running
camera_running = False

try:
    while True:
        # Read the sensor value
        if GPIO.input(17) == GPIO.LOW:  # Object detected
            print("📦 Object Detected!")
            if not camera_running:
                print("📸 Starting camera...")
                # Start the Node.js script
                subprocess.Popen(['node', 'start-camera.js'])
                camera_running = True
                # Wait for 10 seconds before allowing next trigger
                time.sleep(10)
                camera_running = False
        else:
            print("⭕ No Object Detected")
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 Stopping sensor test...")
finally:
    # Clean up GPIO settings
    GPIO.cleanup()