import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import {
  registerPasskey,
  getUserPasskeys,
  deletePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  type Passkey
} from '../services/passkeys';
import { extractError, getErrorMessage, logError } from '../lib/errorHandler';
import { Card, Button } from './ui';
import { Fingerprint, Shield, Plus } from 'lucide-react';
import { PasskeyList } from './PasskeyList';
import { RegisterPasskeyModal } from './RegisterPasskeyModal';

/** Displays the user's registered passkeys and provides passkey registration and deletion actions. */
export default function PasskeyManagement() {
  const { t } = useTranslation();
  const { showNotification } = useNotification();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);

  useEffect(() => {
    checkWebAuthnSupport();
    loadPasskeys();
  }, []);

  const checkWebAuthnSupport = async () => {
    const supported = isWebAuthnSupported();
    setWebAuthnSupported(supported);
    if (supported) {
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      setPlatformAuthAvailable(platformAvailable);
    }
  };

  const loadPasskeys = async () => {
    setLoading(true);
    try {
      const data = await getUserPasskeys();
      setPasskeys(data);
    } catch (_error) {
      showNotification('error', t('passkeys.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) { showNotification('error', t('passkeys.deviceNameRequired')); return; }
    setRegisterLoading(true);
    try {
      const result = await registerPasskey(deviceName.trim());
      if (result.success) {
        showNotification('success', t('passkeys.registeredSuccessfully'));
        setIsRegisterModalOpen(false);
        setDeviceName('');
        loadPasskeys();
      } else {
        throw new Error(result.error);
      }
    } catch (error: Error | unknown) {
      logError(extractError(error), 'PasskeyManagement.handleRegisterPasskey');
      showNotification('error', getErrorMessage(error, t('passkeys.registrationFailed')));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string, dName: string) => {
    if (!window.confirm(t('passkeys.confirmDelete', { deviceName: dName }))) return;
    try {
      const success = await deletePasskey(passkeyId);
      if (success) { showNotification('success', t('passkeys.deletedSuccessfully')); loadPasskeys(); }
      else throw new Error('Failed to delete passkey');
    } catch (error: Error | unknown) {
      logError(extractError(error), 'PasskeyManagement.handleDeletePasskey');
      showNotification('error', getErrorMessage(error, t('passkeys.deletionFailed')));
    }
  };

  const closeModal = () => { setIsRegisterModalOpen(false); setDeviceName(''); };

  if (!webAuthnSupported) {
    return (
      <Card>
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('passkeys.notSupported')}</h3>
          <p className="text-gray-600">{t('passkeys.browserNotSupported')}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-6 h-6 text-primary-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('passkeys.title')}</h2>
                <p className="text-sm text-gray-600">{t('passkeys.description')}</p>
              </div>
            </div>
            <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={() => setIsRegisterModalOpen(true)} disabled={loading}>
              {t('passkeys.addNew')}
            </Button>
          </div>

          {platformAuthAvailable && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary-600" />
                <span className="text-primary-800 font-medium">{t('passkeys.biometricAvailable')}</span>
              </div>
              <p className="text-primary-700 text-sm mt-1">{t('passkeys.biometricDescription')}</p>
            </div>
          )}

          <PasskeyList passkeys={passkeys} loading={loading} onDelete={handleDeletePasskey} onRegisterClick={() => setIsRegisterModalOpen(true)} />
        </div>
      </Card>

      <RegisterPasskeyModal
        show={isRegisterModalOpen}
        deviceName={deviceName}
        registerLoading={registerLoading}
        onClose={closeModal}
        onDeviceNameChange={setDeviceName}
        onSubmit={handleRegisterPasskey}
      />
    </div>
  );
}

