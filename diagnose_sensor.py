import RPi.GPIO as GPIO
import time

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO 17 as input with pull-up resistor
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("🔍 Sensor Diagnostic Started")
print("This will show raw GPIO values for 10 seconds")
print("Press Ctrl+C to exit")

try:
    start_time = time.time()
    while time.time() - start_time < 10:
        value = GPIO.input(17)
        print(f"Raw GPIO Value: {value}")
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 Stopping diagnostic...")
finally:
    GPIO.cleanup() 