import { useTranslation } from 'react-i18next';
import { Modal, Button } from '../../components/ui';
import type { ComplaintFormData, ComplaintCategory, ComplaintPriority } from './types';

interface ComplaintFormModalProps {
  show: boolean;
  onClose: () => void;
  formData: ComplaintFormData;
  setFormData: React.Dispatch<React.SetStateAction<ComplaintFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export default function ComplaintFormModal({
  show,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
}: ComplaintFormModalProps) {
  const { t } = useTranslation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const categories: ComplaintCategory[] = ['general', 'workplace', 'harassment', 'safety', 'policy', 'other'];
  const priorities: ComplaintPriority[] = ['low', 'normal', 'high', 'urgent'];

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        {t('complaints.submitComplaint')}
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('complaints.subject')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('complaints.subjectPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('complaints.categoryLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {t(`complaints.category.${category}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('complaints.priorityLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {t(`complaints.priority.${priority}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('complaints.descriptionPlaceholder')}
            />
          </div>

          <div className="bg-primary-50 border-l-4 border-primary-400 p-4">
            <p className="text-sm text-primary-700">
              {t('complaints.confidentialNote')}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.saving') : t('complaints.submitComplaint')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
