import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, Fingerprint, CheckCircle, KeyRound } from 'lucide-react';

type VerifyMethod = 'password' | 'passkey';

interface Props {
  verifyMethod: VerifyMethod;
  passkeyVerified: boolean;
  verifyingPasskey: boolean;
  loadingPasskeys: boolean;
  showPasskeyOption: boolean;
  webAuthnSupported: boolean;
  hasPasskeys: boolean;
  loading: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  onMethodChange: (m: VerifyMethod) => void;
  onCurrentPasswordChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onToggleCurrent: () => void;
  onToggleNew: () => void;
  onToggleConfirm: () => void;
  onPasskeyVerify: () => void;
  onChangePassword: () => void;
}


export function PasswordChangeForm({
  verifyMethod, passkeyVerified, verifyingPasskey, loadingPasskeys, showPasskeyOption,
  webAuthnSupported, hasPasskeys, loading,
  currentPassword, newPassword, confirmPassword,
  showCurrentPassword, showNewPassword, showConfirmPassword,
  onMethodChange, onCurrentPasswordChange, onNewPasswordChange, onConfirmPasswordChange,
  onToggleCurrent, onToggleNew, onToggleConfirm, onPasskeyVerify, onChangePassword,
}: Props) {
  const { t } = useTranslation();

  const newPasswordFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword')}</label>
        <div className="relative">
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button type="button" onClick={onToggleNew} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
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
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button type="button" onClick={onToggleConfirm} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <button
        onClick={onChangePassword}
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

      {!loadingPasskeys && showPasskeyOption && (
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-5 gap-1">
          <button
            type="button"
            onClick={() => onMethodChange('password')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${verifyMethod === 'password' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Lock className="w-4 h-4" />
            {t('settings.verifyWithCurrentPassword', 'Current Password')}
          </button>
          <button
            type="button"
            onClick={() => onMethodChange('passkey')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${verifyMethod === 'passkey' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
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
                  onChange={(e) => onCurrentPasswordChange(e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button type="button" onClick={onToggleCurrent} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {newPasswordFields}
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
                  onClick={onPasskeyVerify}
                  disabled={verifyingPasskey}
                  className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4" />
                  {verifyingPasskey ? t('settings.passkeyVerifying', 'Verifying...') : t('settings.verifyWithPasskeyBtn', 'Verify with Passkey')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.passkeyVerifySuccess', 'Identity verified with passkey')}</span>
                </div>
                {newPasswordFields}
              </>
            )}
          </>
        )}

        {!loadingPasskeys && webAuthnSupported && !hasPasskeys && (
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
