import { AlertCircle, CheckCircle, X } from 'lucide-react';

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
            {hasSufficientData ? 'Data Available' : 'Limited Data'}
          </h2>
        </div>

        {/* Week Range */}
        <p className="text-sm text-gray-600 mb-4">
          Week: {formatDate(weekStart)} - {formatDate(weekEndStr)}
        </p>

        {/* Data Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{daysWithData}</div>
            <div className="text-sm text-gray-600">days with attendance data</div>
            <div className="text-xs text-gray-500 mt-1">(out of 7 days)</div>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 mb-4">
          {hasSufficientData ? (
            <>
              {showWarning ? (
                <>
                  This week has limited attendance records. Performance calculation will be based on
                  {daysWithData} day{daysWithData !== 1 ? 's' : ''} of data. Continue?
                </>
              ) : (
                <>Complete week data is available. You can safely calculate performance for this week.</>
              )}
            </>
          ) : (
            <>No attendance data found for this week. Performance cannot be calculated without attendance records.</>
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
            disabled={isLoading}
          >
            Cancel
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
            {isLoading ? 'Calculating...' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}
