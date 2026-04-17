import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock } from 'lucide-react';

interface OtpLockoutScreenProps {
  email: string;
  onBack: () => void;
  getCooldown: (email: string) => Promise<number>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  onRetryAllowed: () => void;
}

/**
 * TASK 4: OTP Lockout Screen
 * 
 * Shown when OTP verification attempts hit 5 (too many attempts).
 * Displays a dedicated "Too many attempts" message with:
 * - Single CTA: "Request a new code"
 * - Disabled with countdown if cooldown is active
 * - Enabled to send a fresh code otherwise
 * 
 * The OTP attempt counter is reset server-side only after a new code
 * is successfully sent, not before.
 */
export default function OtpLockoutScreen({
  email,
  onBack,
  getCooldown,
  sendOtp,
  onRetryAllowed,
}: OtpLockoutScreenProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize cooldown on mount
  useEffect(() => {
    const init = async () => {
      const remaining = await getCooldown(email);
      setCooldownRemaining(remaining);
    };
    init();
  }, [email, getCooldown]);

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleRequestNewCode = async () => {
    setError('');
    setLoading(true);

    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setError(sendError);
      setLoading(false);
      return;
    }

    // OTP attempt counter is reset server-side on successful send
    setLoading(false);
    onRetryAllowed();
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.tooManyOtpAttempts', {
              defaultValue: 'Too Many Attempts',
            })}
          </h1>
          <p className="text-sm text-gray-600">
            {t('auth.otpLockedMessage', {
              defaultValue:
                'You have entered an incorrect code too many times. Request a new code to continue.',
            })}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Cooldown countdown */}
        {cooldownRemaining > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {t('auth.requestNewCodeIn', {
                defaultValue: 'Request new code in',
              })}
            </span>
            <span className="font-mono font-bold text-yellow-600 text-lg">
              {cooldownRemaining}s
            </span>
          </div>
        )}

        {/* Request new code button */}
        <button
          onClick={handleRequestNewCode}
          disabled={loading || cooldownRemaining > 0}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed mb-3"
        >
          {loading
            ? t('auth.sending', { defaultValue: 'Sending...' })
            : t('auth.requestNewOtp', {
                defaultValue: 'Request a New Code',
              })}
        </button>

        {/* Back button */}
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full text-gray-500 hover:text-gray-700 text-sm transition-colors disabled:opacity-50"
        >
          {t('auth.backToLogin', { defaultValue: 'Back to Login' })}
        </button>
      </div>
    </div>
  );
}
