import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'fair' | 'good' | 'strong'>('weak');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateToken = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tokenHash = searchParams.get('token_hash');
        const queryType = searchParams.get('type');

        if (tokenHash && queryType === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error || !data?.session) {
            showNotification('error', t('resetPassword.invalidLink'));
            setValidating(false);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          setIsValidToken(true);
          setValidating(false);
          return;
        }

        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
          const { data: sessionData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (setError || !sessionData?.session) {
            showNotification('error', t('resetPassword.invalidLink'));
            setValidating(false);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          setIsValidToken(true);
          setValidating(false);
          return;
        }

        showNotification('error', t('resetPassword.invalidLink'));
        setValidating(false);
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        console.error('Token validation error:', error);
        showNotification('error', t('resetPassword.invalidLink'));
        setValidating(false);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    validateToken();
  }, [navigate, showNotification]);

  const calculatePasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return 'weak';

    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (strengthScore <= 1) return 'weak';
    if (strengthScore === 2) return 'fair';
    if (strengthScore === 3) return 'good';
    return 'strong';
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!password) {
      newErrors.password = t('resetPassword.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('resetPassword.passwordMinLength');
    } else if (!(/[A-Z]/.test(password)) || !(/[a-z]/.test(password)) || !(/\d/.test(password))) {
      newErrors.password = t('resetPassword.passwordComplexity');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.confirmRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.passwordsMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));

    if (errors.password) {
      setErrors({ ...errors, password: '' });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);

    if (errors.confirmPassword) {
      setErrors({ ...errors, confirmPassword: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      navigate('/login', { state: { successMessage: t('resetPassword.passwordChanged') } });
    } catch (error: any) {
      console.error('Error changing password:', error);

      if (error.message?.includes('Invalid Refresh Token')) {
        showNotification('error', t('resetPassword.sessionExpired'));
        setTimeout(() => navigate('/login'), 2000);
      } else {
        showNotification('error', error.message || t('resetPassword.failedToChange'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          </div>
          <p className="text-center text-gray-600">{t('resetPassword.validating')}</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return null;
  }

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-yellow-500';
      case 'good': return 'bg-blue-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return t('resetPassword.weak');
      case 'fair': return t('resetPassword.fair');
      case 'good': return t('resetPassword.good');
      case 'strong': return t('resetPassword.strong');
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-blue-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('resetPassword.title')}</h1>
          <p className="text-gray-600 text-sm">{t('resetPassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('resetPassword.newPassword')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder={t('resetPassword.enterNewPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password}
              </div>
            )}

            {password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('resetPassword.passwordStrength')}</span>
                  <span className="text-xs font-medium text-gray-700">{getStrengthText()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getStrengthColor()} transition-all duration-300`}
                    style={{
                      width: passwordStrength === 'weak' ? '25%' :
                             passwordStrength === 'fair' ? '50%' :
                             passwordStrength === 'good' ? '75%' : '100%'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  {t('resetPassword.requirements')}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('resetPassword.confirmPassword')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder={t('resetPassword.confirmYourPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword}
              </div>
            )}
          </div>

          {confirmPassword && password === confirmPassword && (
            <div className="flex items-center text-green-600 text-sm bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('resetPassword.passwordsMatch')}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValidToken}
            className={`w-full py-2 px-4 rounded-lg font-medium transition duration-200 ${
              loading || !isValidToken
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-900 text-white hover:bg-blue-800 active:scale-95'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t('resetPassword.updatingPassword')}
              </div>
            ) : (
              t('resetPassword.changePassword')
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-700">
            {t('resetPassword.securityTip')}
          </p>
        </div>
      </div>
    </div>
  );
}
