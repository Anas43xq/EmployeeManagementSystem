/**
 * Login Component (Refactored)
 * Priority 3: SOLID - Reduced complexity via hook extraction
 * 
 * This component now handles only rendering logic.
 * All async/state logic moved to custom hooks:
 * - useLanguageSwitcher: Language toggle
 * - useLoginForm: Form state management
 * - useOtpFlow: OTP authentication flow
 * - useProgressiveCountdown: Delay countdown timer
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { extractError, getErrorMessage, logError } from '../services/errorHandler';
import { checkIpMacLimits, getLoginAttemptStatus, sendLoginOtp, getOtpRequestCooldownRemaining, verifyLoginOtp } from '../services/session/loginAttempts';
import { isWebAuthnSupported, authenticateWithPasskey } from '../services/passkeys';
import { sendPasswordResetEmail } from '../services/auth';

// Extracted hooks
import { useLanguageSwitcher } from '../hooks/useLanguageSwitcher';
import { useLoginForm } from '../hooks/useLoginForm';
import { useOtpFlow } from '../hooks/useOtpFlow';
import { useProgressiveCountdown } from '../hooks/useProgressiveCountdown';

import OtpScreen from './login/OtpScreen';
import PasskeyScreen from './login/PasskeyScreen';
import ForgotPasswordScreen from './login/ForgotPasswordScreen';
import EmailScreen from './login/EmailScreen';

type Screen = 'login' | 'otp' | 'passkey' | 'forgot';
type LoginLocationState = { successMessage?: string } | null;

function getSuccessMessage(state: unknown): string | undefined {
  if (!state || typeof state !== 'object' || !('successMessage' in state)) {
    return undefined;
  }

  return typeof state.successMessage === 'string' ? state.successMessage : undefined;
}

/** Renders the login flow and routes between sign-in, OTP, passkey, and password reset screens. */
export default function Login() {
  // Extract form state management
  const form = useLoginForm();

  // Extract language switching logic
  const { isRTL, toggleLanguage, languageLabel } = useLanguageSwitcher();

  // Extract OTP flow logic
  const otp = useOtpFlow();

  // Extract countdown timer logic
  const { countdown: delayCountdown, start: startCountdown } = useProgressiveCountdown();

  // Core auth/nav contexts
  const { user, signIn } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Component state
  const [screen, setScreen] = useState<Screen>('login');
  const [passkeySupported] = useState(isWebAuthnSupported);

  // Local helper: get success message from navigation state
  const successMessage = getSuccessMessage(location.state as LoginLocationState);

  // Route user if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.isActive === false ? '/deactivated' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  /**
   * Handle login form submission
   * Orchestrates form validation, rate limiting, and auth flow
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.clearErrors();
    form.setLoading(true);

    try {
      // Check IP/MAC rate limit (device-level)
      const ipMacStatus = await checkIpMacLimits(form.email);
      if (!ipMacStatus.allowed) {
        const minutes = Math.ceil(ipMacStatus.secondsUntilReset / 60);
        form.setIpMacLimitMessage(
          t('auth.ipMacLimitExceeded', {
            minutes,
            defaultValue: `Too many login attempts from this device. Please try again in ${minutes} minute(s).`,
          })
        );
        form.setError(t('auth.tooManyAttempts', { defaultValue: 'Too many login attempts. Please try again later.' }));
        form.setLoading(false);
        return;
      }

      // Check progressive delay window
      const attemptStatus = await getLoginAttemptStatus(form.email);
      if (attemptStatus.secondsUntilRetry > 0) {
        startCountdown(attemptStatus.secondsUntilRetry);
        form.setError(
          t('auth.progressiveDelayActive', {
            seconds: attemptStatus.secondsUntilRetry,
            defaultValue: `Please wait ${attemptStatus.secondsUntilRetry} seconds before retrying.`,
          })
        );
        form.setLoading(false);
        return;
      }

      // Attempt sign in
      await signIn(form.email, form.password);
      showNotification('success', t('auth.signedInSuccess'));
      navigate('/dashboard', { replace: true });
    } catch (err: Error | unknown) {
      logError(extractError(err), 'Login.handleSubmit');
      const errorMessage = getErrorMessage(err, '');

      // Handle specific error scenarios
      if (errorMessage === 'EMAIL_NOT_FOUND') {
        form.setError(t('auth.emailNotFound'));
        showNotification('error', t('auth.emailNotFound'));
      } else if (errorMessage === 'REQUIRES_OTP_NEW') {
        // New OTP needed — trigger flow
        const { success, error } = await otp.triggerOtpFlow(form.email);
        if (!success && error) {
          form.setError(error);
        } else {
          setScreen('otp');
        }
      } else if (errorMessage === 'REQUIRES_OTP_ACTIVE') {
        // OTP already sent
        otp.setOtpEmail(form.email);
        setScreen('otp');
      } else if (errorMessage.startsWith('ATTEMPTS_REMAINING:')) {
        const remaining = parseInt(errorMessage.split(':')[1], 10) || 0;
        form.setWarnMessage(t('auth.attemptsRemaining', { attempts: remaining }));
        form.setError(t('auth.invalidCredentials'));
        showNotification('error', t('auth.invalidCredentials'));
      } else if (errorMessage.toLowerCase().includes('banned') || errorMessage.toLowerCase().includes('user is banned')) {
        form.setError(t('auth.accountBanned'));
        showNotification('error', t('auth.accountBanned'));
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        form.setError(t('auth.emailNotConfirmed'));
        showNotification('error', t('auth.emailNotConfirmed'));
      } else {
        form.setError(t('auth.invalidCredentials'));
        showNotification('error', t('auth.invalidCredentials'));
      }
    } finally {
      form.setLoading(false);
    }
  };

  // Screen: OTP
  if (screen === 'otp') {
    return (
      <OtpScreen
        email={otp.otpEmail}
        onBack={() => setScreen('login')}
        verifyOtp={verifyLoginOtp}
        sendOtp={sendLoginOtp}
        getCooldown={getOtpRequestCooldownRemaining}
        onSuccess={() => {
          showNotification('success', t('auth.signedInSuccess'));
          navigate('/dashboard', { replace: true });
        }}
      />
    );
  }

  // Screen: Passkey
  if (screen === 'passkey') {
    return (
      <PasskeyScreen
        onBack={() => setScreen('login')}
        authenticate={authenticateWithPasskey}
        onSuccess={() => {
          showNotification('success', t('auth.signedInSuccess'));
          navigate('/dashboard', { replace: true });
        }}
      />
    );
  }

  // Screen: Forgot Password
  if (screen === 'forgot') {
    const resetPasswordFn = async (email: string, redirectUrl: string) => {
      try {
        const error = await sendPasswordResetEmail(email, redirectUrl);
        return { error };
      } catch (err) {
        return { error: new Error(getErrorMessage(err)) };
      }
    };

    return (
      <ForgotPasswordScreen
        onBack={() => setScreen('login')}
        resetPassword={resetPasswordFn}
      />
    );
  }

  // Screen: Login Form (main)
  return (
    <EmailScreen
      form={form}
      delayCountdown={delayCountdown}
      passkeySupported={passkeySupported}
      isRTL={isRTL}
      languageLabel={languageLabel}
      successMessage={successMessage}
      onSubmit={handleSubmit}
      onForgotPassword={() => setScreen('forgot')}
      onPasskey={() => setScreen('passkey')}
      toggleLanguage={toggleLanguage}
    />
  );
}
