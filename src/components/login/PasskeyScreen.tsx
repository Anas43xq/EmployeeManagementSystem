import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { authenticateWithPasskey } from '../../services/passkeys';
import { ArrowLeft, Fingerprint } from 'lucide-react';

interface PasskeyScreenProps {
  onBack: () => void;
}

export default function PasskeyScreen({ onBack }: PasskeyScreenProps) {
  const [passkeyEmail, setPasskeyEmail] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState('');

  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasskeyLoading(true);

    try {
      const result = await authenticateWithPasskey(passkeyEmail);

      if (result.success) {
        showNotification('success', t('auth.passkeyLoginSuccess'));
        navigate('/dashboard', { replace: true });
      } else {
        const msg = result.error?.toLowerCase() || '';
        if (msg.includes('banned') || msg.includes('user is banned')) {
          setError(t('auth.accountBanned'));
          showNotification('error', t('auth.accountBanned'));
        } else {
          setError(result.error || t('auth.passkeyLoginFailed'));
        }
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('banned') || msg.includes('user is banned')) {
        setError(t('auth.accountBanned'));
        showNotification('error', t('auth.accountBanned'));
      } else {
        setError(err.message || t('auth.passkeyLoginFailed'));
        showNotification('error', err.message || t('auth.passkeyLoginFailed'));
      }
    } finally {
      setPasskeyLoading(false);
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
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {t('auth.passkeyLogin')}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {t('auth.passkeyLoginDesc')}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePasskeyLogin} className="space-y-6">
          <div>
            <label htmlFor="passkey-email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="passkey-email"
              type="email"
              value={passkeyEmail}
              onChange={(e) => setPasskeyEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passkeyLoading}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {passkeyLoading ? (
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
