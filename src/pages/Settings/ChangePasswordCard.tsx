import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { extractError, getErrorMessage, logError } from '../../lib/errorHandler';
import { getCurrentAuthUser, signInForVerification, updateCurrentUserPassword } from '../../services/auth';
import { signOutCurrentSession } from '../../services/session';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getUserPasskeys,
  verifyPasskeyIdentity,
  isWebAuthnSupported,
  type Passkey,
} from '../../services/passkeys';
import { PasswordChangeForm } from './PasswordChangeForm';

type VerifyMethod = 'password' | 'passkey';

/** Lets the current user change their password with password or passkey verification. */
export default function ChangePasswordCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [userPasskeys, setUserPasskeys] = useState<Passkey[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [webAuthnSupported] = useState<boolean>(() => isWebAuthnSupported());
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('password');
  const [passkeyVerified, setPasskeyVerified] = useState(false);
  const [verifyingPasskey, setVerifyingPasskey] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showPasskeyOption = webAuthnSupported && userPasskeys.length > 0;

  useEffect(() => {
    getUserPasskeys().then((keys) => { setUserPasskeys(keys); setLoadingPasskeys(false); });
  }, []);

  const handleMethodChange = (method: VerifyMethod) => {
    setVerifyMethod(method);
    setPasskeyVerified(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasskeyVerify = async () => {
    const user = await getCurrentAuthUser();
    if (!user?.email) { showNotification('error', t('common.error', 'An error occurred')); return; }
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
    if (!newPassword || !confirmPassword) { showNotification('error', t('settings.allFieldsRequired', 'All fields are required')); return false; }
    if (newPassword.length < 8) { showNotification('error', t('resetPassword.passwordMinLength')); return false; }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showNotification('error', t('resetPassword.requirements', 'Requirements: 8+ characters, uppercase, lowercase, and numbers'));
      return false;
    }
    if (newPassword !== confirmPassword) { showNotification('error', t('resetPassword.passwordsMismatch')); return false; }
    return true;
  };

  const handleChangePassword = async () => {
    if (verifyMethod === 'passkey') {
      if (!passkeyVerified) { showNotification('error', t('settings.passkeyVerifyFirst', 'Please verify your identity with a passkey first')); return; }
      if (!validateNewPassword()) return;
      setLoading(true);
      try {
        await updateCurrentUserPassword(newPassword);
        setPasskeyVerified(false);
        await signOutCurrentSession();
        navigate('/login', { state: { successMessage: t('settings.passwordChanged', 'Password changed successfully!') } });
      } catch (_error: unknown) {
        logError(extractError(_error), 'ChangePasswordCard.handleChangePassword.passkey');
        showNotification('error', getErrorMessage(_error, t('resetPassword.failedToChange')));
      } finally {
        setLoading(false);
      }
    } else {
      if (!currentPassword) { showNotification('error', t('settings.allFieldsRequired', 'All fields are required')); return; }
      if (!validateNewPassword()) return;
      setLoading(true);
      try {
        const user = await getCurrentAuthUser();
        if (!user?.email) throw new Error('User not found');
        const signInError = await signInForVerification(user.email, currentPassword);
        if (signInError) { showNotification('error', t('settings.currentPasswordIncorrect', 'Current password is incorrect')); return; }
        await updateCurrentUserPassword(newPassword);
        await signOutCurrentSession();
        navigate('/login', { state: { successMessage: t('settings.passwordChanged', 'Password changed successfully!') } });
      } catch (_error: unknown) {
        logError(extractError(_error), 'ChangePasswordCard.handleChangePassword.password');
        showNotification('error', getErrorMessage(_error, t('resetPassword.failedToChange')));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <PasswordChangeForm
      verifyMethod={verifyMethod}
      passkeyVerified={passkeyVerified}
      verifyingPasskey={verifyingPasskey}
      loadingPasskeys={loadingPasskeys}
      showPasskeyOption={showPasskeyOption}
      webAuthnSupported={webAuthnSupported}
      hasPasskeys={userPasskeys.length > 0}
      loading={loading}
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      showCurrentPassword={showCurrentPassword}
      showNewPassword={showNewPassword}
      showConfirmPassword={showConfirmPassword}
      onMethodChange={handleMethodChange}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onToggleCurrent={() => setShowCurrentPassword(p => !p)}
      onToggleNew={() => setShowNewPassword(p => !p)}
      onToggleConfirm={() => setShowConfirmPassword(p => !p)}
      onPasskeyVerify={handlePasskeyVerify}
      onChangePassword={handleChangePassword}
    />
  );
}
