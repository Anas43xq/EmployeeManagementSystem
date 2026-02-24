import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, LogOut, Briefcase } from 'lucide-react';

export default function Deactivated() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // If the user somehow becomes active again (or navigates here while active), send them home
  useEffect(() => {
    if (user && user.is_active !== false) {
      navigate('/dashboard', { replace: true });
    }
    // If no user at all, redirect to login
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Red top strip */}
          <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />

          <div className="p-8 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Deactivated
            </h1>

            {/* Body copy */}
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your account has been deactivated and you no longer have access
              to the system. If you believe this is a mistake, please reach
              out to your HR department or system administrator.
            </p>

            {/* Contact box */}
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Need help? Contact
              </p>
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-gray-400">👤</span>
                Your HR Department
              </p>
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-gray-400">🛡️</span>
                System Administrator
              </p>
              {user?.email && (
                <p className="text-xs text-gray-400 mt-1 pt-2 border-t border-gray-200">
                  Signed in as <span className="font-medium text-gray-600">{user.email}</span>
                </p>
              )}
            </div>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </button>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          {t('auth.employeeManagementSystem')}
        </p>
      </div>
    </div>
  );
}
