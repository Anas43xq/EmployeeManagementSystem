import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Briefcase } from 'lucide-react';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');

  const { showNotification } = useNotification();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetLoading(true);

    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;

      showNotification('success', t('auth.resetEmailSent'));
      onBack();
    } catch (err: Error | unknown) {
      setError((err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : '') || t('auth.resetEmailFailed'));
      showNotification('error', t('auth.resetEmailFailed'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <button
          onClick={onBack}
          className={`flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('auth.backToSignIn')}</span>
        </button>

        <div className="flex items-center justify-center mb-8">
          <div className="bg-primary-900 p-3 rounded-lg">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {t('auth.resetPassword')}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {t('auth.resetPasswordDesc')}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetLoading ? t('common.sending') : t('auth.sendResetLink')}
          </button>
        </form>
      </div>
    </div>
  );
}
