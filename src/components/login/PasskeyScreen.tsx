import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { usePasskeyLogin, getDirectionClass } from '../../hooks/useAuthHooks';
import { ArrowLeft, Fingerprint } from 'lucide-react';

interface PasskeyScreenProps {
  onBack: () => void;
  authenticate: (email: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

export default function PasskeyScreen({ onBack, authenticate, onSuccess }: PasskeyScreenProps) {
  const { showNotification } = useNotification();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { email, setEmail, loading, error, login } = usePasskeyLogin({
    authenticate,
    onSuccess,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email)) {
      showNotification('success', t('auth.passkeyLoginSuccess'));
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
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">{t('auth.passkeyLogin')}</h1>
        <p className="text-center text-gray-600 mb-8">{t('auth.passkeyLoginDesc')}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="passkey-email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="passkey-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>{t('auth.authenticating')}</span>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>{t('auth.signInWithPasskey')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
