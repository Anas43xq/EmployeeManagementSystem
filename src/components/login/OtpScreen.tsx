import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { useOtp } from '../../hooks/useAuthHooks';
import { handleError } from '../../lib/errorHandler';
import { Mail, Clock } from 'lucide-react';

interface OtpScreenProps {
  email: string;
  onBack: () => void;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  getCooldown: (email: string) => Promise<number>;
  onSuccess: () => void;
}

export default function OtpScreen({
  email,
  onBack,
  verifyOtp,
  sendOtp,
  getCooldown,
  onSuccess,
}: OtpScreenProps) {
  const { showNotification } = useNotification();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const {
    code,
    setCode,
    loading,
    error,
    countdown,
    cooldownRemaining,
    showCooldown,
    isVerifyDisabled,
    isResendDisabled,
    verify,
    resend,
  } = useOtp({
    email,
    onBack,
    verifyOtp,
    sendOtp,
    getCooldown,
    onSuccess,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await verify(code);
    if (!success && error) {
      // Route error through registry
      await handleError(error, {
        form: { setError: () => {} },
        t,
        showNotification,
      });
    } else if (success) {
      showNotification('success', t('auth.otpVerifiedSuccess'));
    }
  };

  const handleResend = async () => {
    const success = await resend();
    if (!success && error) {
      // Route error through registry
      await handleError(error, {
        form: { setError: () => {} },
        t,
        showNotification,
      });
    } else if (success) {
      showNotification('success', t('auth.newOtpSent'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.enterOtp')}</h1>
          <p className="text-sm text-gray-500">{t('auth.otpSentTo', { email })}</p>
        </div>

        {/* Countdown timer */}
        {countdown > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {t('auth.otpExpiresIn')}
            </span>
            <span className="font-mono font-bold text-blue-600 text-lg">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Cooldown message */}
        {cooldownRemaining > 0 && showCooldown && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              {t('auth.otpRequestCooldown', {
                seconds: cooldownRemaining,
                defaultValue: 'Please wait {{seconds}} seconds before requesting a new code',
              })}
            </p>
          </div>
        )}

        {/* OTP form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            maxLength={8}
            disabled={loading || isVerifyDisabled}
            autoFocus
            className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 disabled:bg-gray-100 transition-colors"
          />

          <button
            type="submit"
            disabled={isVerifyDisabled}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {loading ? t('auth.verifying') : t('auth.verifyOtp')}
          </button>
        </form>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={handleResend}
            disabled={isResendDisabled}
            className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('auth.requestNewOtp')}
          </button>
          <button
            onClick={onBack}
            className="w-full text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
