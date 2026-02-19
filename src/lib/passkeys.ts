import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from './supabase';

export interface PasskeyRegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface PasskeyAuthenticationResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export interface PasskeyAttendanceResult {
  success: boolean;
  attendance?: any;
  employee?: any;
  error?: string;
}

export interface Passkey {
  id: string;
  credential_id: string;
  device_name: string;
  created_at: string | null;
  last_used_at?: string | null;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerPasskey(deviceName: string): Promise<PasskeyRegistrationResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const optionsResponse = await fetch(`${supabaseUrl}/functions/v1/webauthn-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ action: 'generate-options', deviceName }),
    });

    if (!optionsResponse.ok) {
      // Handle edge function not deployed or 404 error
      if (optionsResponse.status === 404) {
        return { 
          success: false, 
          error: 'Passkey registration service is not available. Please contact your administrator.' 
        };
      }
      const errorData = await optionsResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${optionsResponse.status}`);
    }

    const { options, challenge } = await optionsResponse.json();

    const registrationResponse = await startRegistration(options);

    const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/webauthn-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        action: 'verify-registration',
        credential: registrationResponse,
        deviceName,
        expectedChallenge: challenge
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${verifyResponse.status}`);
    }

    const verificationData = await verifyResponse.json();

    return {
      success: true,
      credentialId: verificationData.credentialId
    };

  } catch (error) {
    console.error('Passkey registration error:', error);
    const isAborted = error instanceof Error &&
      (error.name === 'NotAllowedError' || error.message.includes('timed out') || error.message.includes('not allowed'));
    return {
      success: false,
      error: isAborted
        ? 'Passkey registration was cancelled or timed out. Please try again.'
        : (error instanceof Error ? error.message : 'Registration failed')
    };
  }
}

export async function authenticateWithPasskey(email: string): Promise<PasskeyAuthenticationResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('webauthn-authenticate', {
      body: { action: 'generate-options', email }
    });

    if (error) {
      // Handle edge function not deployed or 404 error
      if (error.message?.includes('non-2xx') || error.message?.includes('404') || error.message?.includes('not found')) {
        return { 
          success: false, 
          error: 'Passkey authentication service is not available. Please use email and password to sign in.' 
        };
      }
      throw new Error(error.message);
    }

    if (!data) {
      return { 
        success: false, 
        error: 'No passkey registered for this email. Please sign in with email and password first.' 
      };
    }

    const { options, challenge, userId } = data;

    const authenticationResponse = await startAuthentication(options);

    const { data: verificationData, error: verificationError } = await supabase.functions.invoke('webauthn-authenticate', {
      body: {
        action: 'verify-authentication',
        credential: authenticationResponse,
        expectedChallenge: challenge,
        userId
      }
    });

    if (verificationError) {
      throw new Error(verificationError.message);
    }

    if (verificationData.token_hash) {
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: verificationData.token_hash,
        type: 'magiclink',
      });
      if (sessionError) {
        throw new Error('Failed to establish session');
      }
      return {
        success: true,
        user: verificationData.user,
        session: sessionData.session
      };
    }

    return {
      success: true,
      user: verificationData.user,
      session: verificationData.session
    };

  } catch (error) {
    console.error('Passkey authentication error:', error);
    const isAborted = error instanceof Error &&
      (error.name === 'NotAllowedError' || error.message.includes('timed out') || error.message.includes('not allowed'));
    return {
      success: false,
      error: isAborted
        ? 'Passkey authentication was cancelled or timed out. Please try again.'
        : (error instanceof Error ? error.message : 'Authentication failed')
    };
  }
}

export async function verifyPasskeyAttendance(
  attendanceType: 'check-in' | 'check-out',
  verificationType?: 'face' | 'fingerprint' | 'device'
): Promise<PasskeyAttendanceResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('verify-passkey-attendance', {
      body: { action: 'generate-options' },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      // Handle edge function not deployed or 404 error
      if (error.message?.includes('non-2xx') || error.message?.includes('404') || error.message?.includes('not found')) {
        return { 
          success: false, 
          error: 'Passkey attendance service is not available. Please contact your administrator.' 
        };
      }
      throw new Error(error.message);
    }

    if (!data) {
      return { 
        success: false, 
        error: 'No passkey registered. Please set up a passkey in your profile settings first.' 
      };
    }

    const { options, challenge } = data;

    const authenticationResponse = await startAuthentication(options);

    const { data: verificationData, error: verificationError } = await supabase.functions.invoke('verify-passkey-attendance', {
      body: {
        action: 'verify-attendance',
        credential: authenticationResponse,
        expectedChallenge: challenge,
        attendanceType,
        verificationType
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (verificationError) {
      throw new Error(verificationError.message);
    }

    return {
      success: true,
      attendance: verificationData.attendance,
      employee: verificationData.employee
    };

  } catch (error) {
    console.error('Passkey attendance verification error:', error);
    const isAborted = error instanceof Error &&
      (error.name === 'NotAllowedError' || error.message.includes('timed out') || error.message.includes('not allowed'));
    return {
      success: false,
      error: isAborted
        ? 'Biometric verification was cancelled or timed out. Please try again.'
        : (error instanceof Error ? error.message : 'Verification failed')
    };
  }
}

export async function getUserPasskeys(): Promise<Passkey[]> {
  try {
    const { data, error } = await supabase
      .from('passkeys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Passkey[];
  } catch (error) {
    console.error('Error fetching user passkeys:', error);
    return [];
  }
}

export async function deletePasskey(passkeyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('passkeys')
      .delete()
      .eq('id', passkeyId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return false;
  }
}