
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { extractError, getErrorMessage, logError, handleError } from '../lib/errorHandler';
import { checkIpMacLimits, getLoginAttemptStatus, sendLoginOtp, getOtpRequestCooldownRemaining, verifyLoginOtp } from '../services/session';
import { isWebAuthnSupported } from '../services/passkeys';
import { sendPasswordResetEmail } from '../services/auth';


import { useLanguageSwitcher } from '../hooks/useLanguageSwitcher';
import { useLoginForm } from '../hooks/useLoginForm';
import { useOtpFlow } from '../hooks/useOtpFlow';
import { useProgressiveCountdown } from '../hooks/useProgressiveCountdown';

import OtpScreen from './login/OtpScreen';
import OtpLockoutScreen from './login/OtpLockoutScreen';
import ForgotPasswordScreen from './login/ForgotPasswordScreen';
import EmailScreen from './login/EmailScreen';

type Screen = 'login' | 'otp' | 'otp-lockout' | 'forgot';
type LoginLocationState = { successMessage?: string } | null;

function getSuccessMessage(state: unknown): string | undefined {
  if (!state || typeof state !== 'object' || !('successMessage' in state)) {
    return undefined;
  }

  return typeof state.successMessage === 'string' ? state.successMessage : undefined;
}


export default function Login() {
  
  const form = useLoginForm();

  
  const { isRTL, toggleLanguage, languageLabel } = useLanguageSwitcher();

  
  const otp = useOtpFlow();

  
  const { countdown: delayCountdown, start: startCountdown } = useProgressiveCountdown();

  
  const { user, signIn } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  
  const [screen, setScreen] = useState<Screen>('login');
  const [passkeySupported] = useState(isWebAuthnSupported);

  
  const successMessage = getSuccessMessage(location.state as LoginLocationState);

  
  useEffect(() => {
    if (user) {
      navigate(user.isActive === false ? '/deactivated' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.clearErrors();
    form.setLoading(true);

    try {
      
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

      
      await signIn(form.email, form.password);
      showNotification('success', t('auth.signedInSuccess'));
      navigate('/dashboard', { replace: true });
    } catch (err: Error | unknown) {
      logError(extractError(err), 'Login.handleSubmit');
      const errorMessage = getErrorMessage(err, '');
      await handleError(errorMessage, {
        form,
        t,
        showNotification,
        otp,
        email: form.email,
        setScreen: (screenValue: string) => setScreen(screenValue as Screen),
        navigate,
        getCooldown: getOtpRequestCooldownRemaining,
      });
    } finally {
      form.setLoading(false);
    }
  };

  
  if (screen === 'otp-lockout') {
    return (
      <OtpLockoutScreen
        email={otp.otpEmail}
        onBack={() => setScreen('login')}
        getCooldown={getOtpRequestCooldownRemaining}
        sendOtp={sendLoginOtp}
        onRetryAllowed={() => {
          
          
          setScreen('otp');
        }}
      />
    );
  }

  
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
        onLockout={() => setScreen('otp-lockout')}
      />
    );
  }


  
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
      initialEmail={form.email}
    />
  );
}

  
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
      toggleLanguage={toggleLanguage}
      onSuccessfulLogin={() => {
        showNotification('success', t('auth.signedInSuccess'));
        navigate('/dashboard', { replace: true });
      }}
    />
  );
}
