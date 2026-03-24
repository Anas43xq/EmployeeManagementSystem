import { useTranslation } from 'react-i18next';
import { Fingerprint, Trash2, Plus, Smartphone, Monitor, Globe } from 'lucide-react';
import { Button } from './ui';
import type { Passkey } from '../services/passkeys';

interface Props {
  passkeys: Passkey[];
  loading: boolean;
  onDelete: (id: string, deviceName: string) => void;
  onRegisterClick: () => void;
}

function getDeviceIcon(deviceName: string) {
  const name = deviceName.toLowerCase();
  if (name.includes('phone') || name.includes('mobile') || name.includes('android') || name.includes('ios')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (name.includes('computer') || name.includes('laptop') || name.includes('desktop') || name.includes('mac') || name.includes('windows')) {
    return <Monitor className="w-5 h-5" />;
  }
  return <Globe className="w-5 h-5" />;
}

/** Renders the current passkey list and its empty/loading states. */
export function PasskeyList({ passkeys, loading, onDelete, onRegisterClick }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">{t('passkeys.loading')}</p>
      </div>
    );
  }

  if (passkeys.length === 0) {
    return (
      <div className="text-center py-8">
        <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('passkeys.noPasskeys')}</h3>
        <p className="text-gray-600 mb-4">{t('passkeys.getStarted')}</p>
        <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={onRegisterClick}>
          {t('passkeys.registerFirst')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {passkeys.map((passkey) => (
        <div key={passkey.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getDeviceIcon(passkey.device_name)}
              <div>
                <h4 className="font-medium text-gray-900">{passkey.device_name}</h4>
                <p className="text-sm text-gray-600">
                  {t('passkeys.registeredOn')} {passkey.created_at ? new Date(passkey.created_at).toLocaleDateString() : ''}
                </p>
                {passkey.last_used_at && (
                  <p className="text-xs text-gray-500">
                    {t('passkeys.lastUsed')}: {new Date(passkey.last_used_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => onDelete(passkey.id, passkey.device_name)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {t('common.delete', 'Delete')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
