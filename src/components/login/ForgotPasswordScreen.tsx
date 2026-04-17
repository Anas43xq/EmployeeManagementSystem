import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { useForgotPassword, getDirectionClass } from '../../hooks/useAuthHooks';
import { handleError } from '../../lib/errorHandler';
import { ArrowLeft, Briefcase, Clock } from 'lucide-react';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  resetPassword: (email: string, redirectUrl: string) => Promise<{ error?: Error | null }>;
  initialEmail?: string;
}

const AUTO_SUBMIT_DELAY = 3; // 3 seconds before auto-submit

export default function ForgotPasswordScreen({ onBack, resetPassword, initialEmail = '' }: ForgotPasswordScreenProps) {
  const { showNotification } = useNotification();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [countdown, setCountdown] = useState<number>(0);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const { email, setEmail, loading, error, submit } = useForgotPassword({
    onBack,
    resetPassword,
  });

  // Auto-fill email on mount if initialEmail provided
  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
      setCountdown(AUTO_SUBMIT_DELAY);
    }
  }, [initialEmail, email, setEmail]);

  // Countdown timer for auto-submit
  useEffect(() => {
    if (countdown > 0 && !loading && !hasAutoSubmitted) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Auto-submit when countdown reaches 0 and email is valid
    if (countdown === 0 && email && initialEmail && !loading && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      handleAutoSubmit();
    }
  }, [countdown, email, initialEmail, loading, hasAutoSubmitted]);

  const handleAutoSubmit = async () => {
    const success = await submit(email);
    if (!success && error) {
      // Route error through registry
      await handleError(error, {
        form: { setError: () => {} },
        t,
        showNotification,
      });
    } else if (success) {
      showNotification('success', t('auth.resetEmailSent'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCountdown(0);
    setHasAutoSubmitted(true);
    const success = await submit(email);
    if (!success && error) {
      // Route error through registry
      await handleError(error, {
        form: { setError: () => {} },
        t,
        showNotification,
      });
    } else if (success) {
      showNotification('success', t('auth.resetEmailSent'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <button
          onClick={onBack}
          className={getDirectionClass(isRTL, 'flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors space-x-2', 'flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors space-x-reverse space-x-2')}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('auth.backToSignIn')}</span>
        </button>

        <div className="flex items-center justify-center mb-8">
          <div className="bg-primary-900 p-3 rounded-lg">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">{t('auth.resetPassword')}</h1>
        <p className="text-center text-gray-600 mb-8">{t('auth.resetPasswordDesc')}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Auto-submit countdown */}
        {countdown > 0 && initialEmail && !hasAutoSubmitted && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{t('auth.autoSubmitIn', { seconds: countdown, defaultValue: `Sending reset link in ${countdown}s...` })}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setCountdown(0); // Reset countdown if user edits email
                setHasAutoSubmitted(false);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.sending') : t('auth.sendResetLink')}
          </button>
        </form>
      </div>
    </div>
  );
}
