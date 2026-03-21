import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Modal, Button, FormField } from '../../components/ui';
import type { LeaveFormData, LeaveBalance, LeaveConflict } from './types';

interface ApplyLeaveModalProps {
  show: boolean;
  onClose: () => void;
  formData: LeaveFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeaveFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  leaveBalance: LeaveBalance | null;
  calculateDays: (s: string, e: string) => number;
  getAvailableBalance: (type: string) => number;
  leaveConflicts: LeaveConflict[];
  checkingConflicts: boolean;
  checkLeaveConflicts: (startDate: string, endDate: string) => Promise<LeaveConflict[]>;
}

export default function ApplyLeaveModal({
  show,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
  leaveBalance,
  calculateDays,
  getAvailableBalance,
  leaveConflicts,
  checkingConflicts,
  checkLeaveConflicts,
}: ApplyLeaveModalProps) {
  const { t } = useTranslation();

  // Check for conflicts when dates change
  useEffect(() => {
    if (show && formData.start_date && formData.end_date) {
      checkLeaveConflicts(formData.start_date, formData.end_date);
    }
  }, [formData.start_date, formData.end_date, show]);

  const hasConflicts = leaveConflicts.length > 0;
  const hasInsufficientBalance = formData.start_date && formData.end_date && 
    calculateDays(formData.start_date, formData.end_date) > getAvailableBalance(formData.leave_type) && 
    getAvailableBalance(formData.leave_type) !== 999;

  if (!show) return null;

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>{t('leaves.applyForLeave')}</Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <FormField label={t('leaves.leaveType')}>
            <select
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="annual">{t('leaves.annual')}</option>
              <option value="sick">{t('leaves.sick')}</option>
              <option value="casual">{t('leaves.casual')}</option>
              <option value="sabbatical">{t('leaves.sabbatical')}</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('leaves.startDate')}>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </FormField>
            <FormField label={t('leaves.endDate')}>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </FormField>
          </div>

          {formData.start_date && formData.end_date && (
            <div className="space-y-2">
              <div className="bg-primary-50 px-3 py-2 rounded-lg">
                <p className="text-sm text-primary-800">
                  {t('leaves.duration')}: <strong>{calculateDays(formData.start_date, formData.end_date)} {t('common.days')}</strong>
                </p>
              </div>
              {leaveBalance && getAvailableBalance(formData.leave_type) !== 999 && (
                <div className={`px-3 py-2 rounded-lg ${
                  calculateDays(formData.start_date, formData.end_date) > getAvailableBalance(formData.leave_type)
                    ? 'bg-red-50 text-red-800'
                    : 'bg-green-50 text-green-800'
                }`}>
                  <p className="text-sm">
                    Available {formData.leave_type} balance: <strong>{getAvailableBalance(formData.leave_type)} {t('common.days')}</strong>
                    {calculateDays(formData.start_date, formData.end_date) > getAvailableBalance(formData.leave_type) && (
                      <span className="block text-red-600 font-medium mt-1">{t('leaves.insufficientBalance')}</span>
                    )}
                  </p>
                </div>
              )}

              {checkingConflicts && (
                <div className="bg-gray-50 px-3 py-2 rounded-lg">
                  <p className="text-sm text-gray-600 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    {t('leaves.checkingConflicts')}
                  </p>
                </div>
              )}

              {!checkingConflicts && hasConflicts && (
                <div className="bg-red-50 border border-red-200 px-3 py-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{t('leaves.conflictDetected')}</p>
                      <p className="text-sm text-red-600 mt-1">{t('leaves.conflictsFound', { count: leaveConflicts.length })}</p>
                      <ul className="mt-2 space-y-1">
                        {leaveConflicts.map((conflict) => (
                          <li key={conflict.id} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                            {t('leaves.conflictMessage', {
                              status: conflict.status,
                              type: t(`leaves.${conflict.leave_type}`),
                              startDate: new Date(conflict.start_date).toLocaleDateString(),
                              endDate: new Date(conflict.end_date).toLocaleDateString(),
                            })}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <FormField label={t('leaves.reason')}>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              placeholder={t('leaves.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              required
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            disabled={hasConflicts || !!hasInsufficientBalance || checkingConflicts}
            loading={submitting}
            loadingText={t('leaves.submitting')}
          >
            {t('leaves.submitRequest')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
