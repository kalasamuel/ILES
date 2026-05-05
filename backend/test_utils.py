from notifications.utils import extract_device_info, get_location_from_ip

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
device_info = extract_device_info(ua)
print("Device Info:", device_info)

location_info = get_location_from_ip("127.0.0.1")
print("Location Info:", location_info)
