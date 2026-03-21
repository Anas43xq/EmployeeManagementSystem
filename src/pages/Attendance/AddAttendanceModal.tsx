import { useTranslation } from 'react-i18next';
import { Modal, Button, FormField, FormError } from '../../components/ui';
import type { Employee } from './types';

interface AddAttendanceModalProps {
  show: boolean;
  onClose: () => void;
  formData: {
    employee_id: string;
    date: string;
    check_in: string;
    check_out: string;
    status: 'present' | 'absent' | 'late' | 'half-day';
    notes: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<AddAttendanceModalProps['formData']>>;
  employees: Employee[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
}

export default function AddAttendanceModal({
  show,
  onClose,
  formData,
  setFormData,
  employees,
  onSubmit,
  submitting,
  error,
}: AddAttendanceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>{t('attendance.addAttendanceRecord')}</Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <FormError message={error} />
          <FormField label={t('attendance.employee')} required>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('attendance.selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_number})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('attendance.date')} required>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('attendance.checkIn')}>
              <input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </FormField>
            <FormField label={t('attendance.checkOut')}>
              <input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </FormField>
          </div>
          <FormField label={t('attendance.status')}>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="present">{t('attendance.present')}</option>
              <option value="absent">{t('attendance.absent')}</option>
              <option value="late">{t('attendance.late')}</option>
              <option value="half-day">{t('attendance.halfDay')}</option>
            </select>
          </FormField>
          <FormField label={t('attendance.notes')}>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder={t('attendance.optionalNotes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={submitting} loadingText={t('common.adding')}>
            {t('attendance.addAttendance')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
