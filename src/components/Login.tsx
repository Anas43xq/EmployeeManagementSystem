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
import { checkIpMacLimits, getLoginAttemptStatus, sendLoginOtp, getOtpRequestCooldownRemaining, verifyLoginOtp } from '../services/loginAttempts';
import { isWebAuthnSupported, authenticateWithPasskey } from '../services/passkeys';
import { supabase } from '../services/supabase';

// Extracted hooks
import { useLanguageSwitcher } from '../hooks/useLanguageSwitcher';
import { useLoginForm } from '../hooks/useLoginForm';
import { useOtpFlow } from '../hooks/useOtpFlow';
import { useProgressiveCountdown } from '../hooks/useProgressiveCountdown';

import { Briefcase, Globe, Fingerprint, CheckCircle, Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react';
import OtpScreen from './login/OtpScreen';
import PasskeyScreen from './login/PasskeyScreen';
import ForgotPasswordScreen from './login/ForgotPasswordScreen';

type Screen = 'login' | 'otp' | 'passkey' | 'forgot';

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
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Local helper: get success message from navigation state
  const successMessage = (location.state as any)?.successMessage as string | undefined;

  // Route user if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.is_active === false ? '/deactivated' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Initialize WebAuthn support check
  useEffect(() => {
    setPasskeySupported(isWebAuthnSupported());
  }, []);

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
      const errorMessage: string =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String(err.message)
            : '';

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
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        return { error };
      } catch (err) {
        return { error: new Error(err instanceof Error ? err.message : 'An error occurred') };
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header with logo and language toggle */}
        <div className="flex items-center justify-between mb-6">
          <div />
          <div className="flex flex-col items-center">
            <div className="bg-primary-900 p-3 rounded-xl mb-3">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <span className="text-xs font-medium text-primary-600 tracking-widest uppercase">{t('auth.tagline', 'Employee Management for IT Teams')}</span>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-900 transition-colors"
            title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm">{languageLabel}</span>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">{t('auth.employeeManagementSystem')}</h1>
        <p className="text-center text-gray-600 mb-8">{t('auth.signInToContinue')}</p>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {form.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2">{form.error}</div>}

        {/* Warning Message */}
        {form.warnMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{form.warnMessage}</span>
          </div>
        )}

        {/* IP/MAC Limit Message */}
        {form.ipMacLimitMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{form.ipMacLimitMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => form.setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              <button
                type="button"
                onClick={() => setScreen('forgot')}
                className="text-sm text-primary-900 hover:text-primary-700 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={form.showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => form.setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={form.toggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {form.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={form.loading || delayCountdown > 0}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {delayCountdown > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                {t('auth.retryIn', { seconds: delayCountdown, defaultValue: `Retry in ${delayCountdown}s` })}
              </>
            ) : form.loading ? (
              t('auth.signingIn')
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>

        {/* Authentication Options */}
        <div className="mt-8 space-y-3">
          {/* Passkey Button */}
          {passkeySupported && (
            <button
              type="button"
              onClick={() => setScreen('passkey')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-900 text-primary-900 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              <Fingerprint className="w-5 h-5" />
              {t('auth.signInWithPasskey')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
