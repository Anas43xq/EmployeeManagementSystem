import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sendLoginOtp } from '../services/loginAttempts';
import { isWebAuthnSupported } from '../services/passkeys';
import { Briefcase, Globe, Fingerprint, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import OtpScreen from './login/OtpScreen';
import PasskeyScreen from './login/PasskeyScreen';
import ForgotPasswordScreen from './login/ForgotPasswordScreen';

type Screen = 'login' | 'otp' | 'passkey' | 'forgot';

export default function Login() {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const { user, signIn } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const successMessage = (location.state as any)?.successMessage as string | undefined;
  const isRTL = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    if (user) {
      if (user.is_active === false) {
        navigate('/deactivated', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    setPasskeySupported(isWebAuthnSupported());
  }, []);

  // Trigger OTP flow: send OTP then switch to OTP screen
  const triggerOtpFlow = async (targetEmail: string) => {
    const { error: sendError } = await sendLoginOtp(targetEmail);
    if (sendError) {
      setError(sendError);
      return;
    }
    setOtpEmail(targetEmail);
    setScreen('otp');
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarnMessage('');
    setLoading(true);

    try {
      await signIn(email, password);
      showNotification('success', t('auth.signedInSuccess'));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const errorMessage: string = err?.message || '';

      if (errorMessage === 'EMAIL_NOT_FOUND') {
        setError(t('auth.emailNotFound'));
        showNotification('error', t('auth.emailNotFound'));

      } else if (errorMessage === 'REQUIRES_OTP') {
        // 5 failed attempts reached — send OTP and show OTP screen
        await triggerOtpFlow(email);

      } else if (errorMessage.startsWith('ATTEMPTS_REMAINING:')) {
        const remaining = parseInt(errorMessage.split(':')[1], 10) || 0;
        setWarnMessage(t('auth.attemptsRemaining', { attempts: remaining }));
        setError(t('auth.invalidCredentials'));
        showNotification('error', t('auth.invalidCredentials'));

      } else if (errorMessage.toLowerCase().includes('banned') || errorMessage.toLowerCase().includes('user is banned')) {
        setError(t('auth.accountBanned'));
        showNotification('error', t('auth.accountBanned'));

      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        setError(t('auth.emailNotConfirmed'));
        showNotification('error', t('auth.emailNotConfirmed'));

      } else {
        setError(t('auth.invalidCredentials'));
        showNotification('error', t('auth.invalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };



  if (screen === 'otp') {
    return <OtpScreen email={otpEmail} onBack={() => setScreen('login')} />;
  }

  if (screen === 'passkey') {
    return <PasskeyScreen onBack={() => setScreen('login')} />;
  }

  if (screen === 'forgot') {
    return <ForgotPasswordScreen onBack={() => setScreen('login')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
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
            <span className="text-sm">{isRTL ? 'EN' : 'ع'}</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {t('auth.employeeManagementSystem')}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {t('auth.signInToContinue')}
        </p>

        {successMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2">
            {error}
          </div>
        )}

        {warnMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{warnMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        {passkeySupported && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('auth.orSignInWith')}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setScreen('passkey')}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all"
              >
                <Fingerprint className="w-5 h-5" />
                <span>{t('auth.passkeyLogin')}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
