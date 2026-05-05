"""Utilities for extracting device and location information from login requests."""
import re
import requests
from typing import Dict, Tuple, Optional


def extract_device_info(user_agent: str) -> Dict[str, str]:
    """
    Extract device, browser, and OS information from User-Agent string.
    
    Args:
        user_agent: The User-Agent string from the request
        
    Returns:
        Dictionary with 'device_type', 'browser', 'operating_system', and 'device_name'
    """
    if not user_agent:
        return {
            'device_type': 'unknown',
            'browser': 'Unknown',
            'operating_system': 'Unknown',
            'device_name': 'Unknown Device'
        }
    
    ua = user_agent.lower()
    
    # Detect device type
    device_type = 'desktop'
    if 'mobile' in ua or 'android' in ua:
        device_type = 'mobile'
    elif 'tablet' in ua or 'ipad' in ua:
        device_type = 'tablet'
    
    # Detect operating system
    os_patterns = {
        'Windows': r'windows nt',
        'macOS': r'mac os x',
        'iOS': r'iphone|ipad',
        'Android': r'android',
        'Linux': r'linux',
        'ChromeOS': r'cros',
    }
    
    operating_system = 'Unknown'
    for os_name, pattern in os_patterns.items():
        if re.search(pattern, ua):
            operating_system = os_name
            break
    
    # Detect browser
    browser_patterns = {
        'Chrome': r'chrome/(\d+)',
        'Firefox': r'firefox/(\d+)',
        'Safari': r'version/(\d+).*safari',
        'Edge': r'edg/(\d+)',
        'Opera': r'opera/(\d+)',
        'IE': r'msie (\d+)',
    }
    
    browser = 'Unknown'
    version = ''
    for browser_name, pattern in browser_patterns.items():
        match = re.search(pattern, ua)
        if match:
            browser = browser_name
            version = match.group(1)
            break
    
    if version:
        browser = f"{browser} {version}"
    
    # Create a friendly device name
    device_name = f"{browser} on {operating_system}"
    if device_type != 'desktop':
        device_name = f"{browser} on {operating_system} ({device_type})"
    
    return {
        'device_type': device_type,
        'browser': browser,
        'operating_system': operating_system,
        'device_name': device_name,
    }


def get_location_from_ip(ip_address: str, timeout: int = 5) -> Dict[str, Optional[str]]:
    """
    Get location information from IP address using ipapi.co free service.
    Falls back gracefully if service is unavailable.
    
    Args:
        ip_address: The IP address to look up
        timeout: Request timeout in seconds
        
    Returns:
        Dictionary with 'location', 'country', 'city', 'latitude', 'longitude'
    """
    if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
        return {
            'location': 'Local Machine',
            'country': None,
            'city': None,
            'latitude': None,
            'longitude': None,
        }
    
    try:
        # Using ipapi.co free tier (no authentication required, 30 requests/minute)
        url = f"https://ipapi.co/{ip_address}/json/"
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        
        city = data.get('city', '')
        country = data.get('country_name', '')
        location = f"{city}, {country}".strip(' ,')
        
        if not location:
            location = 'Unknown Location'
        
        return {
            'location': location,
            'country': country or None,
            'city': city or None,
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
        }
    except Exception as e:
        # Silently fail and return unknown
        # We don't want failed geolocation to break the login flow
        return {
            'location': 'Unknown Location',
            'country': None,
            'city': None,
            'latitude': None,
            'longitude': None,
        }


def get_client_ip(request) -> str:
    """
    Get client IP address from request, considering proxies.
    
    Args:
        request: Django request object
        
    Returns:
        IP address string
    """
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')
