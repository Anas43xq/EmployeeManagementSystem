import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { extractError, getErrorMessage, logError } from '../../lib/errorHandler';
import { verifyRecoveryOtp, setRecoverySession, updateCurrentUserPassword } from '../../services/auth';
import { signOutCurrentSession } from '../../services/session';
import { useNotification } from '../../contexts/NotificationContext';
import { ResetPasswordForm } from './ResetPasswordForm';

const INVALID_LINK_REDIRECT_DELAY_MS = 3000;
const SESSION_EXPIRED_REDIRECT_DELAY_MS = 2000;


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
          const { data, error } = await verifyRecoveryOtp(tokenHash);
          if (error || !data?.session) {
            showNotification('error', t('resetPassword.invalidLink'));
            setValidating(false);
            setTimeout(() => navigate('/login'), INVALID_LINK_REDIRECT_DELAY_MS);
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
          const { data: sessionData, error: setError } = await setRecoverySession(accessToken, refreshToken || '');
          if (setError || !sessionData?.session) {
            showNotification('error', t('resetPassword.invalidLink'));
            setValidating(false);
            setTimeout(() => navigate('/login'), INVALID_LINK_REDIRECT_DELAY_MS);
            return;
          }
          setIsValidToken(true);
          setValidating(false);
          return;
        }

        showNotification('error', t('resetPassword.invalidLink'));
        setValidating(false);
        setTimeout(() => navigate('/login'), INVALID_LINK_REDIRECT_DELAY_MS);
      } catch (_error) {
        logError(extractError(_error), 'ResetPassword.validateToken');
        showNotification('error', t('resetPassword.invalidLink'));
        setValidating(false);
        setTimeout(() => navigate('/login'), INVALID_LINK_REDIRECT_DELAY_MS);
      }
    };

    validateToken();
  }, [navigate, showNotification]);

  const calculatePasswordStrength = (pwd: string): 'weak' | 'fair' | 'good' | 'strong' => {
    if (pwd.length < 8) return 'weak';
    const score = [/[A-Z]/, /[a-z]/, /\d/, /[!@#$%^&*(),.?":{}|<>]/].filter(r => r.test(pwd)).length;
    if (score <= 1) return 'weak';
    if (score === 2) return 'fair';
    if (score === 3) return 'good';
    return 'strong';
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!password) newErrors.password = t('resetPassword.passwordRequired');
    else if (password.length < 8) newErrors.password = t('resetPassword.passwordMinLength');
    else if (!(/[A-Z]/.test(password)) || !(/[a-z]/.test(password)) || !(/\d/.test(password)))
      newErrors.password = t('resetPassword.passwordComplexity');
    if (!confirmPassword) newErrors.confirmPassword = t('resetPassword.confirmRequired');
    else if (password !== confirmPassword) newErrors.confirmPassword = t('resetPassword.passwordsMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(calculatePasswordStrength(val));
    if (errors.password) setErrors({ ...errors, password: '' });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await updateCurrentUserPassword(password);
      await signOutCurrentSession();
      navigate('/login', { state: { successMessage: t('resetPassword.passwordChanged') } });
    } catch (_error: unknown) {
      const errorMessage = getErrorMessage(_error);
      logError(extractError(_error), 'ResetPassword.handleSubmit');

      if (errorMessage.includes('Invalid Refresh Token')) {
        showNotification('error', t('resetPassword.sessionExpired'));
        setTimeout(() => navigate('/login'), SESSION_EXPIRED_REDIRECT_DELAY_MS);
      } else {
        showNotification('error', getErrorMessage(_error, t('resetPassword.failedToChange')));
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
          </div>
          <p className="text-center text-gray-600">{t('resetPassword.validating')}</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) return null;

  return (
    <ResetPasswordForm
      password={password}
      confirmPassword={confirmPassword}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
      loading={loading}
      isValidToken={isValidToken}
      passwordStrength={passwordStrength}
      errors={errors}
      onPasswordChange={handlePasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      onTogglePassword={() => setShowPassword(p => !p)}
      onToggleConfirmPassword={() => setShowConfirmPassword(p => !p)}
      onSubmit={handleSubmit}
    />
  );
}
