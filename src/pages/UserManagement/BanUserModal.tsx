import { useTranslation } from 'react-i18next';
import { Ban, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import type { User, BanUserFormData, BanDurationOption } from './types';
import { getUserEmail, getUserDisplayName } from './types';

interface BanUserModalProps {
  show: boolean;
  user: User | null;
  form: BanUserFormData;
  onFormChange: (form: BanUserFormData) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function BanUserModal({
  show,
  user,
  form,
  onFormChange,
  onConfirm,
  onCancel,
  submitting,
}: BanUserModalProps) {
  const { t } = useTranslation();

  const banDurationOptions: BanDurationOption[] = [
    { value: '24', label: t('userManagement.ban1Day') },
    { value: '168', label: t('userManagement.ban1Week') },
    { value: '720', label: t('userManagement.ban30Days') },
    { value: '8760', label: t('userManagement.ban1Year') },
    { value: 'permanent', label: t('userManagement.banPermanent') },
  ];

  if (!user) return null;

  return (
    <Modal
      show={show}
      onClose={onCancel}
      size="md"
    >
      <Modal.Header onClose={onCancel}>
        {t('userManagement.banUser')}
      </Modal.Header>
      <Modal.Body>
        <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {t('userManagement.banWarningTitle')}
            </p>
            <p className="text-sm text-red-700 mt-1">
              {t('userManagement.banWarningText')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('userManagement.userToBan')}
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{getUserDisplayName(user)}</p>
            <p className="text-sm text-gray-500">{getUserEmail(user)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('userManagement.banDuration')}
          </label>
          <select
            value={form.banDuration}
            onChange={(e) => onFormChange({ ...form, banDuration: e.target.value as BanUserFormData['banDuration'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {banDurationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('userManagement.banReason')}
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => onFormChange({ ...form, reason: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder={t('userManagement.banReasonPlaceholder')}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          disabled={submitting}
          icon={<Ban className="w-4 h-4" />}
        >
          {submitting ? t('common.saving') : t('userManagement.banUserBtn')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
