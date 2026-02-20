import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import {
  verifyPasskeyAttendance,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable
} from '../services/passkeys';
import { Button, Card, StatusBadge } from './ui';
import { Fingerprint, Eye, Clock, CheckCircle, LogIn, LogOut } from 'lucide-react';

interface PasskeyAttendanceProps {
  onAttendanceUpdate?: () => void;
  currentAttendance?: {
    id: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    date: string;
  } | null;
}

export default function PasskeyAttendance({ onAttendanceUpdate, currentAttendance }: PasskeyAttendanceProps) {
  const { t } = useTranslation();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);

  useEffect(() => {
    checkWebAuthnSupport();
  }, []);

  const checkWebAuthnSupport = async () => {
    const supported = isWebAuthnSupported();
    setWebAuthnSupported(supported);

    if (supported) {
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      setPlatformAuthAvailable(platformAvailable);
    }
  };

  const handlePasskeyAttendance = async (
    type: 'check-in' | 'check-out',
    verificationType?: 'face' | 'fingerprint' | 'device'
  ) => {
    setLoading(true);
    try {
      const result = await verifyPasskeyAttendance(type, verificationType);

      if (result.success) {
        const message = type === 'check-in'
          ? t('attendance.checkedInSuccessfully')
          : t('attendance.checkedOutSuccessfully');

        showNotification('success', message);

        if (onAttendanceUpdate) {
          onAttendanceUpdate();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('attendance.biometricFailed');
      showNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canCheckIn = !currentAttendance || !currentAttendance.check_in;
  const canCheckOut = currentAttendance && currentAttendance.check_in && !currentAttendance.check_out;

  if (!webAuthnSupported) {
    return (
      <Card>
        <div className="p-6 text-center">
          <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('attendance.biometricNotSupported')}
          </h3>
          <p className="text-gray-600">
            {t('attendance.upgradeBrowser')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Fingerprint className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('attendance.biometricAttendance')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('attendance.secureCheckInOut')}
              </p>
            </div>
          </div>

          {currentAttendance && (
            <StatusBadge
              status={currentAttendance.status}
              label={currentAttendance.status}
            />
          )}
        </div>

        {currentAttendance && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {t('attendance.todayStatus')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 shrink-0">{t('attendance.checkIn')}:</span>
                <span className="font-medium flex items-center">
                  {currentAttendance.check_in ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-600 mr-1 shrink-0" />
                      <span className="whitespace-nowrap">{currentAttendance.check_in}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">{t('attendance.notCheckedIn')}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 shrink-0">{t('attendance.checkOut')}:</span>
                <span className="font-medium flex items-center">
                  {currentAttendance.check_out ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-600 mr-1 shrink-0" />
                      <span className="whitespace-nowrap">{currentAttendance.check_out}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">{t('attendance.notCheckedOut')}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {platformAuthAvailable && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-4 h-4 text-primary-600" />
                <span className="text-primary-800 font-medium text-sm">
                  {t('attendance.biometricReady')}
                </span>
              </div>
              <p className="text-primary-700 text-xs">
                {t('attendance.biometricDescription')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant={canCheckIn ? 'primary' : 'secondary'}
              onClick={() => handlePasskeyAttendance('check-in', platformAuthAvailable ? 'face' : 'device')}
              disabled={!canCheckIn || loading}
              loading={loading}
              icon={<LogIn className="w-5 h-5" />}
              className={`flex-1 py-4 ${canCheckIn
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {t('attendance.biometricCheckIn')}
                </div>
                <div className="text-sm opacity-90">
                  {platformAuthAvailable
                    ? t('attendance.useFaceFingerprint')
                    : t('attendance.usePasskey')
                  }
                </div>
              </div>
            </Button>

            <Button
              variant={canCheckOut ? 'primary' : 'secondary'}
              onClick={() => handlePasskeyAttendance('check-out', platformAuthAvailable ? 'face' : 'device')}
              disabled={!canCheckOut || loading}
              loading={loading}
              icon={<LogOut className="w-5 h-5" />}
              className={`flex-1 py-4 ${canCheckOut
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {t('attendance.biometricCheckOut')}
                </div>
                <div className="text-sm opacity-90">
                  {platformAuthAvailable
                    ? t('attendance.useFaceFingerprint')
                    : t('attendance.usePasskey')
                  }
                </div>
              </div>
            </Button>
          </div>

          {!platformAuthAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800 text-sm font-medium">
                  {t('attendance.passkeyOnly')}
                </span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                {t('attendance.passkeyDescription', 'Biometric sensors not detected. You\'ll be prompted to use your registered passkey for secure authentication.')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            {t('attendance.securityNotice', 'Your biometric data never leaves your device. Only cryptographic signatures are used for verification.')}
          </p>
        </div>
      </div>
    </Card>
  );
}