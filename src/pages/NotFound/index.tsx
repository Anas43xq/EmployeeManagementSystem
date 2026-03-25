import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-600" />

          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-50 border-2 border-primary-100 rounded-full flex items-center justify-center mb-6 -mt-2">
              <AlertCircle className="w-8 h-8 text-primary-500" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('notFound.title')}
            </h1>

            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              {t('notFound.description')}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('notFound.backButton')}
              </button>

              <button
                onClick={handleHome}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors duration-200"
              >
                <Home className="w-4 h-4" />
                {t('notFound.homeButton')}
              </button>
            </div>

            <p className="text-gray-400 text-xs mt-8 pt-8 border-t border-gray-100">
              {t('notFound.helpText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
