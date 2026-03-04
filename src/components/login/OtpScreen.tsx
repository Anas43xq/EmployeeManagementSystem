import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { sendLoginOtp, verifyLoginOtp } from '../../services/loginAttempts';
import { Mail, Clock } from 'lucide-react';

interface OtpScreenProps {
  email: string;
  onBack: () => void;
}

export default function OtpScreen({ email, onBack }: OtpScreenProps) {
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(Date.now() + 10 * 60 * 1000);
  const [otpCountdown, setOtpCountdown] = useState(600);

  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Tick down the OTP countdown
  useEffect(() => {
    const tick = () => {
      const remaining = Math.ceil((otpExpiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setOtpCountdown(0);
        onBack();
      } else {
        setOtpCountdown(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otpExpiresAt, onBack]);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    const result = await verifyLoginOtp(email, otpCode);

    if (result.error || !result.success) {
      setOtpError(result.error || t('auth.otpVerificationFailed'));
      setOtpLoading(false);
      return;
    }

    showNotification('success', t('auth.otpVerifiedSuccess'));
    navigate('/dashboard', { replace: true });
    setOtpLoading(false);
  };

  const handleRequestNewOtp = async () => {
    setOtpLoading(true);
    setOtpError('');

    const { error: sendError } = await sendLoginOtp(email);

    if (sendError) {
      setOtpError(sendError);
    } else {
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setOtpCode('');
      showNotification('success', t('auth.newOtpSent'));
    }
    setOtpLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.enterOtp')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('auth.otpSentTo', { email })}
          </p>
        </div>

        {/* Countdown timer */}
        {otpCountdown > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {t('auth.otpExpiresIn')}
            </span>
            <span className="font-mono font-bold text-blue-600 text-lg">
              {String(Math.floor(otpCountdown / 60)).padStart(2, '0')}:{String(otpCountdown % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* OTP error */}
        {otpError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{otpError}</p>
          </div>
        )}

        {/* OTP form */}
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            maxLength={8}
            disabled={otpLoading}
            autoFocus
            className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 disabled:bg-gray-100 transition-colors"
          />

          <button
            type="submit"
            disabled={otpLoading || otpCode.length < 8}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {otpLoading ? t('auth.verifying') : t('auth.verifyOtp')}
          </button>
        </form>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={handleRequestNewOtp}
            disabled={otpLoading}
            className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
          >
            {t('auth.requestNewOtp')}
          </button>
          <button
            onClick={onBack}
            className="w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
