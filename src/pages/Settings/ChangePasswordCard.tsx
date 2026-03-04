import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, Fingerprint, CheckCircle, KeyRound } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getUserPasskeys,
  verifyPasskeyIdentity,
  isWebAuthnSupported,
  type Passkey,
} from '../../services/passkeys';

type VerifyMethod = 'password' | 'passkey';

export default function ChangePasswordCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Passkey-related state
  const [userPasskeys, setUserPasskeys] = useState<Passkey[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [webAuthnSupported] = useState<boolean>(() => isWebAuthnSupported());
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('password');
  const [passkeyVerified, setPasskeyVerified] = useState(false);
  const [verifyingPasskey, setVerifyingPasskey] = useState(false);

  // Password field state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showPasskeyOption = webAuthnSupported && userPasskeys.length > 0;

  useEffect(() => {
    getUserPasskeys().then((keys) => {
      setUserPasskeys(keys);
      setLoadingPasskeys(false);
    });
  }, []);

  const handleMethodChange = (method: VerifyMethod) => {
    setVerifyMethod(method);
    setPasskeyVerified(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasskeyVerify = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      showNotification('error', t('common.error', 'An error occurred'));
      return;
    }
    setVerifyingPasskey(true);
    const result = await verifyPasskeyIdentity(user.email);
    setVerifyingPasskey(false);
    if (result.success) {
      setPasskeyVerified(true);
    } else {
      showNotification('error', result.error || t('settings.passkeyVerifyFailed', 'Passkey verification failed'));
    }
  };

  const validateNewPassword = (): boolean => {
    if (!newPassword || !confirmPassword) {
      showNotification('error', t('settings.allFieldsRequired', 'All fields are required'));
      return false;
    }
    if (newPassword.length < 8) {
      showNotification('error', t('resetPassword.passwordMinLength'));
      return false;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showNotification('error', t('resetPassword.requirements', 'Requirements: 8+ characters, uppercase, lowercase, and numbers'));
      return false;
    }
    if (newPassword !== confirmPassword) {
      showNotification('error', t('resetPassword.passwordsMismatch'));
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (verifyMethod === 'passkey') {
      if (!passkeyVerified) {
        showNotification('error', t('settings.passkeyVerifyFirst', 'Please verify your identity with a passkey first'));
        return;
      }
      if (!validateNewPassword()) return;

      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPasskeyVerified(false);
        await supabase.auth.signOut();
        navigate('/login', { state: { successMessage: t('settings.passwordChanged', 'Password changed successfully!') } });
      } catch (error: any) {
        showNotification('error', error.message || t('resetPassword.failedToChange'));
      } finally {
        setLoading(false);
      }
    } else {
      if (!currentPassword) {
        showNotification('error', t('settings.allFieldsRequired', 'All fields are required'));
        return;
      }
      if (!validateNewPassword()) return;

      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) throw new Error('User not found');

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          showNotification('error', t('settings.currentPasswordIncorrect', 'Current password is incorrect'));
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        await supabase.auth.signOut();
        navigate('/login', { state: { successMessage: t('settings.passwordChanged', 'Password changed successfully!') } });
      } catch (error: any) {
        showNotification('error', error.message || t('resetPassword.failedToChange'));
      } finally {
        setLoading(false);
      }
    }
  };

  const passwordFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword')}</label>
        <div className="relative">
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.confirmNewPassword')}</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <button
        onClick={handleChangePassword}
        disabled={loading}
        className="bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
      >
        {loading ? t('common.saving') : t('settings.updatePassword')}
      </button>
    </>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Lock className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('settings.changePassword')}</h2>
      </div>

      {/* Verification method tabs — only shown when the user has passkeys */}
      {!loadingPasskeys && showPasskeyOption && (
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-5 gap-1">
          <button
            type="button"
            onClick={() => handleMethodChange('password')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              verifyMethod === 'password'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            {t('settings.verifyWithCurrentPassword', 'Current Password')}
          </button>
          <button
            type="button"
            onClick={() => handleMethodChange('passkey')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              verifyMethod === 'passkey'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            {t('settings.verifyWithPasskey', 'Passkey')}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {verifyMethod === 'password' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.currentPassword')}</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {passwordFields}
          </>
        ) : (
          <>
            {!passkeyVerified ? (
              <div className="flex flex-col items-center py-6 gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
                  <Fingerprint className="w-7 h-7 text-primary-600" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {t('settings.passkeyVerifyPrompt', 'Verify your identity using your registered passkey device')}
                </p>
                <button
                  type="button"
                  onClick={handlePasskeyVerify}
                  disabled={verifyingPasskey}
                  className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4" />
                  {verifyingPasskey
                    ? t('settings.passkeyVerifying', 'Verifying...')
                    : t('settings.verifyWithPasskeyBtn', 'Verify with Passkey')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.passkeyVerifySuccess', 'Identity verified with passkey')}</span>
                </div>
                {passwordFields}
              </>
            )}
          </>
        )}

        {/* Hint to set up a passkey when the user has none but the browser supports it */}
        {!loadingPasskeys && webAuthnSupported && userPasskeys.length === 0 && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <KeyRound className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              {t('settings.noPasskeyForReset', 'Register a passkey in Passkey Management to verify your identity here without entering your current password.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
