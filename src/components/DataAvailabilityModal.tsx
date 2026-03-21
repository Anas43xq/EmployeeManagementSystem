import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DataAvailabilityModalProps {
  weekStart: string;
  daysWithData: number;
  onProceed: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function DataAvailabilityModal({
  weekStart,
  daysWithData,
  onProceed,
  onCancel,
  isLoading = false,
}: DataAvailabilityModalProps) {
  const { t } = useTranslation();
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const hasSufficientData = daysWithData >= 1;
  const showWarning = daysWithData < 7 && daysWithData > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {hasSufficientData ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-orange-600" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {hasSufficientData ? t('performance.dataAvailable') : t('performance.limitedData')}
          </h2>
        </div>

        {/* Week Range */}
        <p className="text-sm text-gray-600 mb-4">
          {t('performance.week')}: {formatDate(weekStart)} - {formatDate(weekEndStr)}
        </p>

        {/* Data Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{daysWithData}</div>
            <div className="text-sm text-gray-600">{t('performance.daysWithAttendance')}</div>
            <div className="text-xs text-gray-500 mt-1">{t('performance.outOf7Days')}</div>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 mb-4">
          {hasSufficientData ? (
            <>
              {showWarning ? (
                <>
                  {t('performance.limitedRecords', { days: daysWithData })}
                </>
              ) : (
                <>{t('performance.fullDataAvailable')}</>
              )}
            </>
          ) : (
            <>{t('performance.noAttendanceData')}</>
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onProceed}
            disabled={!hasSufficientData || isLoading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${
              hasSufficientData
                ? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? t('performance.calculating') : t('performance.proceed')}
          </button>
        </div>
      </div>
    </div>
  );
}
