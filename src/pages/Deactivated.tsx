import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { DEACTIVATION_HOURS } from '../services/loginAttempts';
import { AlertTriangle, LogOut, Briefcase, Clock, ShieldOff } from 'lucide-react';

function useAutoReactivationCountdown(deactivatedAt: string | null) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!deactivatedAt) return;
    const reactivateAt = new Date(deactivatedAt).getTime() + DEACTIVATION_HOURS * 60 * 60 * 1000;

    const tick = () => {
      const diff = reactivateAt - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ hours: h, minutes: m, seconds: s, expired: false });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deactivatedAt]);

  return timeLeft;
}

export default function Deactivated() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const reason = (location.state as any)?.reason as string | undefined;
  const isTooManyAttempts = reason === 'too_many_failed_attempts';

  const [deactivatedAt, setDeactivatedAt] = useState<string | null>(null);
  const countdown = useAutoReactivationCountdown(deactivatedAt);

  // If the user somehow becomes active again, send them home
  useEffect(() => {
    if (user && user.is_active !== false) {
      navigate('/dashboard', { replace: true });
    }
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Fetch the deactivated_at timestamp from login_attempts
  useEffect(() => {
    if (!user || !isTooManyAttempts) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('login_attempts')
      .select('deactivated_at')
      .eq('user_id', user.id)
      .single()
      .then(({ data }: { data: { deactivated_at: string | null } | null }) => {
        if (data?.deactivated_at) setDeactivatedAt(data.deactivated_at);
      });
  }, [user, isTooManyAttempts]);

  // Auto-navigate to login if reactivation countdown expired
  useEffect(() => {
    if (countdown.expired && isTooManyAttempts) {
      navigate('/login', { replace: true });
    }
  }, [countdown.expired, isTooManyAttempts, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />

          <div className="p-8 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mb-6">
              {isTooManyAttempts
                ? <ShieldOff className="w-10 h-10 text-red-500" />
                : <AlertTriangle className="w-10 h-10 text-red-500" />
              }
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Deactivated
            </h1>

            {/* Body copy */}
            {isTooManyAttempts ? (
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {t('auth.deactivatedTooManyAttempts')}
              </p>
            ) : (
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Your account has been deactivated and you no longer have access
                to the system. If you believe this is a mistake, please reach
                out to your HR department or system administrator.
              </p>
            )}

            {/* Auto-reactivation countdown */}
            {isTooManyAttempts && deactivatedAt && !countdown.expired && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                    Auto-reactivation in
                  </p>
                </div>
                <p className="text-2xl font-mono font-bold text-amber-800 text-center">
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </p>
                <p className="text-xs text-amber-600 text-center mt-1">
                  {t('auth.autoReactivatesIn', {
                    hours: countdown.hours,
                    minutes: countdown.minutes,
                  })}
                </p>
              </div>
            )}

            {/* Contact box */}
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {isTooManyAttempts ? t('auth.contactAdminForEarlyReactivation') : 'Need help? Contact'}
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

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          {t('auth.employeeManagementSystem')}
        </p>
      </div>
    </div>
  );
}
