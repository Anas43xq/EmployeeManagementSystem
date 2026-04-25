import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface Props {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  loading: boolean;
  isValidToken: boolean;
  passwordStrength: PasswordStrength;
  errors: { [key: string]: string };
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: 'bg-red-500',
  fair: 'bg-yellow-500',
  good: 'bg-primary-500',
  strong: 'bg-green-500',
};

const STRENGTH_WIDTHS: Record<PasswordStrength, string> = {
  weak: '25%',
  fair: '50%',
  good: '75%',
  strong: '100%',
};


export function ResetPasswordForm({
  password, confirmPassword, showPassword, showConfirmPassword, loading,
  isValidToken, passwordStrength, errors,
  onPasswordChange, onConfirmPasswordChange, onTogglePassword, onToggleConfirmPassword, onSubmit,
}: Props) {
  const { t } = useTranslation();

  const strengthColor = STRENGTH_COLORS[passwordStrength] ?? 'bg-gray-300';
  const strengthWidth = STRENGTH_WIDTHS[passwordStrength] ?? '0%';
  const strengthLabels: Record<PasswordStrength, string> = {
    weak: t('resetPassword.weak'),
    fair: t('resetPassword.fair'),
    good: t('resetPassword.good'),
    strong: t('resetPassword.strong'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-primary-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('resetPassword.title')}</h1>
          <p className="text-gray-600 text-sm">{t('resetPassword.subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('resetPassword.newPassword')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={onPasswordChange}
                placeholder={t('resetPassword.enterNewPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" onClick={onTogglePassword} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />{errors.password}
              </div>
            )}
            {password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('resetPassword.passwordStrength')}</span>
                  <span className="text-xs font-medium text-gray-700">{strengthLabels[passwordStrength]}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: strengthWidth }} />
                </div>
                <p className="text-xs text-gray-600">{t('resetPassword.requirements')}</p>
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
                onChange={onConfirmPasswordChange}
                placeholder={t('resetPassword.confirmYourPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" onClick={onToggleConfirmPassword} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700">
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />{errors.confirmPassword}
              </div>
            )}
          </div>

          {confirmPassword && password === confirmPassword && (
            <div className="flex items-center text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 mr-2" />{t('resetPassword.passwordsMatch')}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValidToken}
            className={`w-full py-2 px-4 rounded-lg font-medium transition duration-200 ${loading || !isValidToken ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-900 text-white hover:bg-primary-800 active:scale-95'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t('resetPassword.updatingPassword')}
              </div>
            ) : t('resetPassword.changePassword')}
          </button>
        </form>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-xs text-gray-700">{t('resetPassword.securityTip')}</p>
        </div>
      </div>
    </div>
  );
}
