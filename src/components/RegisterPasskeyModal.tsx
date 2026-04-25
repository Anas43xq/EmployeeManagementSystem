import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { Modal, Button, FormField } from './ui';

interface Props {
  show: boolean;
  deviceName: string;
  registerLoading: boolean;
  onClose: () => void;
  onDeviceNameChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}


export function RegisterPasskeyModal({ show, deviceName, registerLoading, onClose, onDeviceNameChange, onSubmit }: Props) {
  const { t } = useTranslation();

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        {t('passkeys.registerNew')}
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <p className="text-gray-600 mb-4">{t('passkeys.registerDescription')}</p>
            <FormField label={t('passkeys.deviceName')} required>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => onDeviceNameChange(e.target.value)}
                placeholder={t('passkeys.deviceNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={50}
                required
              />
            </FormField>
          </div>
          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={registerLoading} icon={<Fingerprint className="w-4 h-4" />} className="flex-1">
              {t('passkeys.register')}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
}
