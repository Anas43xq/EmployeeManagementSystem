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
} from '../lib/passkeys';
import { Card, Button, Modal, FormField } from './ui';
import { Fingerprint, Shield, Trash2, Plus, Smartphone, Monitor, Globe } from 'lucide-react';

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
    } catch (error) {
      showNotification('error', t('passkeys.failedToLoad', 'Failed to load passkeys'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      showNotification('error', t('passkeys.deviceNameRequired', 'Device name is required'));
      return;
    }

    setRegisterLoading(true);
    try {
      const result = await registerPasskey(deviceName.trim());

      if (result.success) {
        showNotification('success', t('passkeys.registeredSuccessfully', 'Passkey registered successfully'));
        setIsRegisterModalOpen(false);
        setDeviceName('');
        loadPasskeys();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showNotification('error', error.message || t('passkeys.registrationFailed', 'Failed to register passkey'));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string, deviceName: string) => {
    const confirmed = window.confirm(
      t('passkeys.confirmDelete', `Are you sure you want to delete the passkey for "${deviceName}"?`, { deviceName })
    );

    if (!confirmed) return;

    try {
      const success = await deletePasskey(passkeyId);

      if (success) {
        showNotification('success', t('passkeys.deletedSuccessfully', 'Passkey deleted successfully'));
        loadPasskeys();
      } else {
        throw new Error('Failed to delete passkey');
      }
    } catch (error: any) {
      showNotification('error', error.message || t('passkeys.deletionFailed', 'Failed to delete passkey'));
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('phone') || name.includes('mobile') || name.includes('android') || name.includes('ios')) {
      return <Smartphone className="w-5 h-5" />;
    }
    if (name.includes('computer') || name.includes('laptop') || name.includes('desktop') || name.includes('mac') || name.includes('windows')) {
      return <Monitor className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  if (!webAuthnSupported) {
    return (
      <Card>
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('passkeys.notSupported', 'Passkeys Not Supported')}
          </h3>
          <p className="text-gray-600">
            {t('passkeys.browserNotSupported', 'Your browser does not support WebAuthn passkeys. Please use a modern browser like Chrome, Firefox, Safari, or Edge.')}
          </p>
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
              <Fingerprint className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('passkeys.title', 'Passkey Management')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('passkeys.description', 'Manage your biometric authentication methods')}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setIsRegisterModalOpen(true)}
              disabled={loading}
            >
              {t('passkeys.addNew', 'Add New Passkey')}
            </Button>
          </div>

          {platformAuthAvailable && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {t('passkeys.biometricAvailable', 'Biometric authentication available')}
                </span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                {t('passkeys.biometricDescription', 'You can use face recognition or fingerprint to secure your account.')}
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">{t('passkeys.loading', 'Loading passkeys...')}</p>
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-8">
              <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('passkeys.noPasskeys', 'No Passkeys Registered')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('passkeys.getStarted', 'Get started by registering your first passkey for secure authentication.')}
              </p>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => setIsRegisterModalOpen(true)}
              >
                {t('passkeys.registerFirst', 'Register Your First Passkey')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {passkeys.map((passkey) => (
                <div key={passkey.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(passkey.device_name)}
                      <div>
                        <h4 className="font-medium text-gray-900">{passkey.device_name}</h4>
                        <p className="text-sm text-gray-600">
                          {t('passkeys.registeredOn', 'Registered on')} {new Date(passkey.created_at).toLocaleDateString()}
                        </p>
                        {passkey.last_used_at && (
                          <p className="text-xs text-gray-500">
                            {t('passkeys.lastUsed', 'Last used')}: {new Date(passkey.last_used_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDeletePasskey(passkey.id, passkey.device_name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        show={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setDeviceName('');
        }}
      >
        <Modal.Header onClose={() => {
          setIsRegisterModalOpen(false);
          setDeviceName('');
        }}>
          {t('passkeys.registerNew', 'Register New Passkey')}
        </Modal.Header>
        <Modal.Body>
        <form onSubmit={handleRegisterPasskey} className="space-y-6">
          <div>
            <p className="text-gray-600 mb-4">
              {t('passkeys.registerDescription', 'Give your device a name to help you identify it later. Your browser will then prompt you to use your biometric authentication.')}
            </p>

            <FormField
              label={t('passkeys.deviceName', 'Device Name')}
              required
            >
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t('passkeys.deviceNamePlaceholder', 'e.g., iPhone, Work Computer, Personal Laptop')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                required
              />
            </FormField>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRegisterModalOpen(false);
                setDeviceName('');
              }}
              className="flex-1"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={registerLoading}
              icon={<Fingerprint className="w-4 h-4" />}
              className="flex-1"
            >
              {t('passkeys.register', 'Register Passkey')}
            </Button>
          </div>
        </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}