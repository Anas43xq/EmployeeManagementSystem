import { useTranslation } from 'react-i18next';
import { Mail, X } from 'lucide-react';

interface EmailConfirmationModalProps {
  email: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isRTL?: boolean;
}

export default function EmailConfirmationModal({
  email,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  isRTL = false,
}: EmailConfirmationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
        {}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {}
        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
          {t('auth.emailConfirmTitle')}
        </h2>

        {}
        <p className="text-center text-gray-600 mb-4">
          {t('auth.emailConfirmMessage')}
        </p>

        {}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">
            {t('auth.emailConfirmEmail', { email: '' })}
          </p>
          <p className="text-lg font-semibold text-gray-900 break-all">{email}</p>
        </div>

        {}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('auth.emailConfirmNo')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                {t('common.loading')}
              </>
            ) : (
              t('auth.emailConfirmYes')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
