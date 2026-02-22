import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase, db } from './supabase';
import { clearAuthState } from './sessionManager';

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
    // Clear any stale auth state before attempting passkey login
    // This prevents "Invalid Refresh Token" errors from stale sessions
    await clearAuthState();

    // Use fetch directly instead of supabase.functions.invoke for better error handling
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const optionsResponse = await fetch(`${supabaseUrl}/functions/v1/webauthn-authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ action: 'generate-options', email }),
    });

    if (!optionsResponse.ok) {
      if (optionsResponse.status === 404) {
        return { 
          success: false, 
          error: 'Passkey authentication service is not available. Please use email and password to sign in.' 
        };
      }
      const errorData = await optionsResponse.json().catch(() => ({}));
      if (errorData.error?.includes('No passkeys registered') || errorData.error?.includes('User not found')) {
        return { 
          success: false, 
          error: 'No passkey registered for this email. Please sign in with email and password first.' 
        };
      }
      throw new Error(errorData.error || `HTTP ${optionsResponse.status}`);
    }

    const data = await optionsResponse.json();

    if (!data) {
      return { 
        success: false, 
        error: 'No passkey registered for this email. Please sign in with email and password first.' 
      };
    }

    const { options, challenge, userId } = data;

    const authenticationResponse = await startAuthentication(options);

    const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/webauthn-authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        action: 'verify-authentication',
        credential: authenticationResponse,
        expectedChallenge: challenge,
        userId
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Verification failed: HTTP ${verifyResponse.status}`);
    }

    const verificationData = await verifyResponse.json();

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
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const name = error.name.toLowerCase();
      
      // User cancelled or timed out
      if (name === 'notallowederror' || message.includes('timed out') || message.includes('not allowed') || message.includes('cancelled')) {
        return {
          success: false,
          error: 'Passkey authentication was cancelled or timed out. Please try again.'
        };
      }
      
      // Network errors
      if (name === 'typeerror' || message.includes('failed to fetch') || message.includes('network')) {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }
      
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}

export async function getUserPasskeys(): Promise<Passkey[]> {
  try {
    const { data, error } = await db
      .from('passkeys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Passkey[];
  } catch (error) {
    return [];
  }
}

export async function deletePasskey(passkeyId: string): Promise<boolean> {
  try {
    const { error } = await db
      .from('passkeys')
      .delete()
      .eq('id', passkeyId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
}