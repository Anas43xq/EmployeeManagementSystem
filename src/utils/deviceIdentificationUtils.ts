
interface NavigatorFingerprintData {
  deviceMemory?: number;
}


export async function getUserIpAddress(): Promise<string> {
  const CACHE_KEY = 'ems_cached_ip_v1';
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; 
  const FETCH_TIMEOUT_MS = 3000; 

  try {
    
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
      
    }

    
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

    
    if (ip !== 'unknown') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ip, timestamp: Date.now() }));
        console.debug('[IP Cache] Cached IP:', ip.substring(0, 10) + '...');
      } catch (_e) {
        
      }
    }

    return ip;
  } catch (err) {
    
    console.debug('[IP Fetch] Error fetching IP:', err instanceof Error ? err.message : String(err));
    return 'unknown';
  }
}


function getUserAgent(): string {
  return navigator.userAgent || 'unknown';
}


function getDeviceFingerprint(): string {
  try {
    const fingerprintNavigator = navigator as Navigator & NavigatorFingerprintData;
    const parts: string[] = [];

    
    if (typeof fingerprintNavigator.deviceMemory === 'number') {
      parts.push(`dm${fingerprintNavigator.deviceMemory}`);
    }

    
    if (typeof fingerprintNavigator.hardwareConcurrency === 'number') {
      parts.push(`cpu${fingerprintNavigator.hardwareConcurrency}`);
    }

    
    if (typeof fingerprintNavigator.maxTouchPoints === 'number') {
      parts.push(`touch${fingerprintNavigator.maxTouchPoints}`);
    }

    
    const screenKey = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    parts.push(`screen${screenKey}`);

    
    if ('language' in navigator) {
      parts.push(`lang${navigator.language}`);
    }

    
    const tzOffset = new Date().getTimezoneOffset();
    parts.push(`tz${tzOffset}`);

    return parts.join('|');
  } catch {
    return 'unknown';
  }
}


function getPersistentDeviceId(): string {
  const DEVICE_ID_KEY = 'ems_device_id_v1';

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      
      deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    
    return 'unknown';
  }
}


export async function getDeviceIdentifier(): Promise<string> {
  const ip = await getUserIpAddress();
  const ua = getUserAgent();
  const fp = getDeviceFingerprint();
  const deviceId = getPersistentDeviceId();

  
  return `${ip}|${ua}|${fp}|${deviceId}`;
}


export async function getDeviceProxy(): Promise<{ ipAddress: string; userAgent: string }> {
  return {
    ipAddress: await getUserIpAddress(),
    userAgent: getUserAgent(),
  };
}

