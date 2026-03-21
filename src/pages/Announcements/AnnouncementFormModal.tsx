import { useTranslation } from 'react-i18next';
import { Modal, Button, FormField, FormError } from '../../components/ui';
import type { Announcement } from './types';

interface AnnouncementFormModalProps {
  show: boolean;
  onClose: () => void;
  editingAnnouncement: Announcement | null;
  formData: {
    title: string;
    content: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_active: boolean;
    expires_at: string;
  };
  setFormData: (data: AnnouncementFormModalProps['formData']) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
}

export default function AnnouncementFormModal({
  show,
  onClose,
  editingAnnouncement,
  formData,
  setFormData,
  onSubmit,
  submitting,
  error,
}: AnnouncementFormModalProps) {
  const { t } = useTranslation();

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <Modal.Header onClose={onClose}>
        {editingAnnouncement ? t('announcements.editAnnouncement') : t('announcements.newAnnouncement')}
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <FormError message={error} />
          <FormField label={t('announcements.announcementTitle')} required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('announcements.titlePlaceholder')}
            />
          </FormField>
          <FormField label={t('announcements.content')} required>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('announcements.contentPlaceholder')}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('announcements.priority')}>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as unknown as 'low' | 'normal' | 'high' | 'urgent' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">{t('announcements.low')}</option>
                <option value="normal">{t('announcements.normal')}</option>
                <option value="high">{t('announcements.high')}</option>
                <option value="urgent">{t('announcements.urgent')}</option>
              </select>
            </FormField>
            <FormField label={t('announcements.expiresOn')}>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </FormField>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              {t('announcements.activeLabel')}
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting} loadingText={t('common.saving')}>
            {editingAnnouncement ? t('announcements.update') : t('announcements.create')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
