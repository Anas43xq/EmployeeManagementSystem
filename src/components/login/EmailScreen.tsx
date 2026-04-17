import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Globe, Fingerprint, CheckCircle, Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react';
import type { useLoginForm } from '../../hooks/useLoginForm';
import { useIntegratedPasskeyLogin } from '../../hooks/useAuthHooks';
import { authenticateWithPasskey } from '../../services/passkeys';
import EmailConfirmationModal from './EmailConfirmationModal';

interface EmailScreenProps {
  form: ReturnType<typeof useLoginForm>;
  delayCountdown: number;
  passkeySupported: boolean;
  isRTL: boolean;
  languageLabel: string;
  successMessage?: string;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  toggleLanguage: () => void;
  onSuccessfulLogin?: () => void;
}

/** Renders the main email-and-password login screen with integrated passkey option. */
export default function EmailScreen({
  form,
  delayCountdown,
  passkeySupported,
  isRTL,
  languageLabel,
  successMessage,
  onSubmit,
  onForgotPassword,
  toggleLanguage,
  onSuccessfulLogin,
}: EmailScreenProps) {
  const { t } = useTranslation();
  const passkey = useIntegratedPasskeyLogin({ authenticate: authenticateWithPasskey });
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'passkey' | 'password' | null>(null);

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasskeyClick = async () => {
    // Clear any previous form errors
    form.clearErrors?.();
    
    if (!form.email || !form.email.trim()) {
      passkey.authenticate('');
      return;
    }
    if (!isValidEmail(form.email)) {
      form.setError(t('auth.emailInvalid'));
      return;
    }
    // Show email confirmation before passkey
    setPendingAction('passkey');
    setShowEmailConfirm(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any previous passkey errors
    passkey.clearError();
    
    if (!isValidEmail(form.email)) {
      form.setError(t('auth.emailInvalid'));
      return;
    }
    // Show email confirmation before password
    setPendingAction('password');
    setShowEmailConfirm(true);
  };

  const handleEmailConfirmed = async () => {
    if (pendingAction === 'passkey') {
      setShowEmailConfirm(false);
      const success = await passkey.authenticate(form.email);
      if (success) {
        onSuccessfulLogin?.();
      }
    } else if (pendingAction === 'password') {
      setShowEmailConfirm(false);
      onSubmit(new Event('submit') as any);
    }
    setPendingAction(null);
  };

  const handleForgotPassword = () => {
    // Clear any previous passkey errors
    passkey.clearError();
    
    // Validate email before switching to forgot password screen
    if (!form.email || !form.email.trim()) {
      form.setError(t('auth.emailRequired', 'Email is required'));
      return;
    }
    if (!isValidEmail(form.email)) {
      form.setError(t('auth.emailInvalid'));
      return;
    }
    // Email is valid, proceed to forgot password screen
    onForgotPassword();
  };

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

        {/* Passkey Error Message */}
        {passkey.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{passkey.error}</p>
              <button
                type="button"
                onClick={() => passkey.clearError()}
                className="text-xs underline hover:no-underline mt-1"
              >
                {t('auth.dismiss')}
              </button>
            </div>
          </div>
        )}

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
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
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
                onClick={handleForgotPassword}
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
          {passkeySupported && (
            <button
              type="button"
              onClick={handlePasskeyClick}
              disabled={passkey.loading || form.loading || delayCountdown > 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-900 text-primary-900 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passkey.loading ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  {t('auth.authenticating', 'Authenticating...')}
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  {t('auth.signInWithPasskey')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        email={form.email}
        isOpen={showEmailConfirm}
        onConfirm={handleEmailConfirmed}
        onCancel={() => {
          setShowEmailConfirm(false);
          setPendingAction(null);
        }}
        isLoading={form.loading || passkey.loading}
        isRTL={isRTL}
      />
    </div>
  );
}
