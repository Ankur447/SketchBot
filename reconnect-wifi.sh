# WiFi connectivity test (and reconnect if needed)
# Source: https://feriman.com/automatically-reconnect-to-wifi-on-raspberry-pi/
#
# Check the connectivity 
if ! ping -c2 8.8.8.8 > /dev/null; then
# Shut down the wlan0 adapter if the network is not reachable
       ifconfig wlan0 down
# Sleep 2 seconds to be sure
        sleep 2
# Start the wlan0 adapter again
# It will reconnect to the WiFi automatically
       ifconfig wlan0 up
# Sleep 10 seconds to be sure
        sleep 10
 # Put here all services with network dependencies
        systemctl restart ngrok-client
fi
