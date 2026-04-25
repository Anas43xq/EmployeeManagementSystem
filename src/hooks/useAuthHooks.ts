import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';


export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err && 'message' in err) return String(err.message);
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}


export function getDirectionClass(isRTL: boolean, normal: string, rtl: string): string {
  return isRTL ? rtl : normal;
}


interface UseOtpProps {
  email: string;
  onBack: () => void;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  getCooldown: (email: string) => Promise<number>;
  onSuccess: () => void;
  onLockout?: () => void;
  maxAttempts?: number;
}

export function useOtp({
  email,
  onBack,
  verifyOtp,
  sendOtp,
  getCooldown,
  onSuccess,
  onLockout,
  maxAttempts = 5,
}: UseOtpProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState(Date.now() + 10 * 60 * 1000);
  const [countdown, setCountdown] = useState(600);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showCooldown, setShowCooldown] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  
  useEffect(() => {
    const tick = () => {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        onBack();
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onBack]);

  
  useEffect(() => {
    if (cooldownRemaining > 0 && showCooldown) {
      cooldownRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current!);
            setShowCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldownRemaining, showCooldown]);

  
  useEffect(() => {
    const init = async () => {
      const remaining = await getCooldown(email);
      if (remaining > 0) {
        setCooldownRemaining(remaining);
        setShowCooldown(true);
      }
    };
    init();
  }, [email, getCooldown]);

  const verify = async (otpCode: string): Promise<boolean> => {
    setError('');
    setLoading(true);

    const result = await verifyOtp(email, otpCode);

    if (result.error || !result.success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      
      
      if (newAttempts >= maxAttempts) {
        setIsLockedOut(true);
        setError('Too many verification attempts. Request a new code to continue.');
        setLoading(false);
        if (onLockout) onLockout();
        return false;
      }

      if (result.error?.toLowerCase().includes('rate limit')) {
        setError('Too many OTP attempts. Please try again later.');
      } else {
        setError(result.error || 'OTP verification failed');
      }
      setLoading(false);
      return false;
    }

    setLoading(false);
    onSuccess();
    return true;
  };

  const resend = async (): Promise<boolean> => {
    setLoading(true);
    setError('');

    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setError(sendError);
      setLoading(false);
      return false;
    }

    
    
    setExpiresAt(Date.now() + 10 * 60 * 1000);
    setCode('');
    setAttempts(0);
    setIsLockedOut(false);
    setCooldownRemaining(60); 
    setShowCooldown(true);
    setLoading(false);
    return true;
  };

  return {
    code,
    setCode,
    loading,
    error,
    countdown,
    cooldownRemaining,
    showCooldown,
    attempts,
    isLockedOut,
    isVerifyDisabled: loading || code.length < 8 || attempts >= maxAttempts,
    isResendDisabled: loading || cooldownRemaining > 0,
    verify,
    resend,
  };
}


interface UseForgotPasswordProps {
  onBack: () => void;
  resetPassword: (email: string, redirectUrl: string) => Promise<{ error?: Error | null }>;
}

export function useForgotPassword({ onBack, resetPassword }: UseForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (resetEmail: string): Promise<boolean> => {
    setError('');
    setLoading(true);

    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/reset-password`;

      const result = await resetPassword(resetEmail, redirectUrl);

      if (result.error) throw result.error;

      setEmail('');
      setLoading(false);
      onBack();
      return true;
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      setLoading(false);
      return false;
    }
  };

  return { email, setEmail, loading, error, submit };
}


interface UsePasskeyLoginProps {
  authenticate: (email: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

export function usePasskeyLogin({
  authenticate,
  onSuccess,
}: UsePasskeyLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (passkeyEmail: string): Promise<boolean> => {
    setError('');
    setLoading(true);

    try {
      const result = await authenticate(passkeyEmail);

      if (result.success) {
        setLoading(false);
        onSuccess();
        return true;
      }

      const msg = result.error?.toLowerCase() || '';
      if (msg.includes('banned') || msg.includes('user is banned')) {
        setError('Your account has been banned');
      } else {
        setError(result.error || 'Passkey login failed');
      }
      setLoading(false);
      return false;
    } catch (err) {
      const msg = extractErrorMessage(err).toLowerCase();
      if (msg.includes('banned') || msg.includes('user is banned')) {
        setError('Your account has been banned');
      } else {
        setError(extractErrorMessage(err));
      }
      setLoading(false);
      return false;
    }
  };

  return { email, setEmail, loading, error, login };
}


interface UseIntegratedPasskeyLoginProps {
  authenticate: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export function useIntegratedPasskeyLogin({
  authenticate,
}: UseIntegratedPasskeyLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const authenticate_passkey = async (email: string): Promise<boolean> => {
    setError('');
    setLoading(true);

    try {
      
      if (!email || !email.trim()) {
        setError(t('auth.emailRequired', 'Email is required for passkey authentication'));
        setLoading(false);
        return false;
      }

      const result = await authenticate(email);

      if (result.success) {
        setLoading(false);
        return true;
      }

      const msg = result.error?.toLowerCase() || '';
      if (msg.includes('banned') || msg.includes('user is banned')) {
        setError(t('auth.passkeyAccountBanned'));
      } else if (msg.includes('no passkey')) {
        setError(t('auth.passkeyNoPasskey'));
      } else if (msg.includes('not found')) {
        setError(t('auth.passkeyUserNotFound'));
      } else if (msg.includes('cancelled')) {
        setError(t('auth.passkeyCancelled'));
      } else if (msg.includes('timeout')) {
        setError(t('auth.passkeyTimeout'));
      } else if (msg.includes('not supported') || msg.includes('unavailable')) {
        setError(t('auth.passkeyNotSupported'));
      } else {
        setError(t('auth.passkeyFallback'));
      }
      setLoading(false);
      return false;
    } catch (err) {
      const msg = extractErrorMessage(err).toLowerCase();
      if (msg.includes('banned') || msg.includes('user is banned')) {
        setError(t('auth.passkeyAccountBanned'));
      } else if (msg.includes('network') || msg.includes('connection')) {
        setError(t('auth.passkeyNetworkError'));
      } else {
        setError(t('auth.passkeyFallback'));
      }
      setLoading(false);
      return false;
    }
  };

  const clearError = () => setError('');

  return { loading, error, authenticate: authenticate_passkey, clearError };
}
