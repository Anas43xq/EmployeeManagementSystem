/**
 * ipMacUtils.ts
 * Device fingerprinting and IP detection utilities
 * 
 * Note: Browsers cannot access true MAC addresses for security reasons.
 * Instead, we use a combination of IP address + user-agent + device fingerprint
 * as a reasonable proxy for device identification.
 */

interface NavigatorFingerprintData {
  deviceMemory?: number;
}

/**
 * Get user's public IP address with caching
 * Caches result for 24 hours to avoid excessive API calls
 * Falls back to 'unknown' if unable to determine
 */
export async function getUserIpAddress(): Promise<string> {
  const CACHE_KEY = 'ems_cached_ip_v1';
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  const FETCH_TIMEOUT_MS = 3000; // 3 second timeout

  try {
    // Tier 1: Check localStorage cache first (instant, ~90% of calls)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ip, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS && ip && ip !== 'unknown') {
          console.debug('[IP Cache] Using cached IP:', ip.substring(0, 10) + '...');
          return ip;
        }
      }
    } catch (_e) {
      // localStorage unavailable (incognito), continue to fetch
    }

    // Tier 2: Fetch fresh IP with timeout (~10% of calls)
    console.debug('[IP Fetch] Fetching fresh IP from api.ipify.org');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.debug('[IP Fetch] API returned status:', response.status);
      return 'unknown';
    }

    const data = (await response.json()) as { ip?: string };
    const ip = data.ip || 'unknown';

    // Cache the result for future use
    if (ip !== 'unknown') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ip, timestamp: Date.now() }));
        console.debug('[IP Cache] Cached IP:', ip.substring(0, 10) + '...');
      } catch (_e) {
        // localStorage full or unavailable
      }
    }

    return ip;
  } catch (err) {
    // Network timeout, parse error, or other issue
    console.debug('[IP Fetch] Error fetching IP:', err instanceof Error ? err.message : String(err));
    return 'unknown';
  }
}

/**
 * Get browser user-agent string (used for device fingerprinting)
 */
function getUserAgent(): string {
  return navigator.userAgent || 'unknown';
}

/**
 * Generate a device fingerprint using browser capabilities
 * Combines multiple signals that are unlikely to change across sessions
 * but unique enough to identify a device/browser combo
 */
function getDeviceFingerprint(): string {
  try {
    const fingerprintNavigator = navigator as Navigator & NavigatorFingerprintData;
    const parts: string[] = [];

    // Browser memory (in GB)
    if (typeof fingerprintNavigator.deviceMemory === 'number') {
      parts.push(`dm${fingerprintNavigator.deviceMemory}`);
    }

    // CPU cores
    if (typeof fingerprintNavigator.hardwareConcurrency === 'number') {
      parts.push(`cpu${fingerprintNavigator.hardwareConcurrency}`);
    }

    // Touchscreen capability
    if (typeof fingerprintNavigator.maxTouchPoints === 'number') {
      parts.push(`touch${fingerprintNavigator.maxTouchPoints}`);
    }

    // Screen resolution
    const screenKey = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    parts.push(`screen${screenKey}`);

    // Language
    if ('language' in navigator) {
      parts.push(`lang${navigator.language}`);
    }

    // Timezone offset
    const tzOffset = new Date().getTimezoneOffset();
    parts.push(`tz${tzOffset}`);

    return parts.join('|');
  } catch {
    return 'unknown';
  }
}

/**
 * Get a persistent device ID from localStorage
 * Creates one on first call and reuses on subsequent calls
 * Note: cleared if user clears browser data
 */
function getPersistentDeviceId(): string {
  const DEVICE_ID_KEY = 'ems_device_id_v1';

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a new ID: timestamp + random bytes
      deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // localStorage unavailable (incognito mode or blocked)
    return 'unknown';
  }
}

/**
 * Combine IP + user-agent + fingerprint into a single identifier
 * This is used as a proxy for "MAC address" in the rate limiter
 */
export async function getDeviceIdentifier(): Promise<string> {
  const ip = await getUserIpAddress();
  const ua = getUserAgent();
  const fp = getDeviceFingerprint();
  const deviceId = getPersistentDeviceId();

  // Combine all signals (prefer IP+UA as primary, add fingerprint as secondary)
  return `${ip}|${ua}|${fp}|${deviceId}`;
}

/**
 * Get just the "MAC proxy" part (IP + user-agent) for rate limiting
 * This is what we send to the RPC function for IP/MAC limit checking
 */
export async function getMacProxy(): Promise<{ ipAddress: string; userAgent: string }> {
  return {
    ipAddress: await getUserIpAddress(),
    userAgent: getUserAgent(),
  };
}


