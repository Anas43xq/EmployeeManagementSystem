import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { LeaveFormData, LeaveBalance } from './types';

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
}: ApplyLeaveModalProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('leaves.applyForLeave')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('leaves.leaveType')}
            </label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('leaves.startDate')}
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('leaves.endDate')}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
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
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('leaves.reason')}
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              placeholder={t('leaves.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('leaves.submitting')}</span>
                </>
              ) : (
                <span>{t('leaves.submitRequest')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
