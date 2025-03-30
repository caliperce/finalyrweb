import RPi.GPIO as GPIO
import time

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 17 as input with pull-up resistor
# This is important for NPN sensors
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Proximity Sensor Test Started")
print("Press Ctrl+C to exit")

try:
    while True:
        # Read the sensor value
        # For NPN sensors, LOW means object detected
        if GPIO.input(17) == GPIO.LOW:
            print("📦 Object Detected!")
        else:
            print("⭕ No Object Detected")
        time.sleep(0.1)  # Reduced delay for more responsive readings

except KeyboardInterrupt:
    print("\n🛑 Stopping sensor test...")
finally:
    # Clean up GPIO settings
    GPIO.cleanup() 