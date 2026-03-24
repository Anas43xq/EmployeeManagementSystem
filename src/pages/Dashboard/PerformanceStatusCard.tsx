import { useTranslation } from 'react-i18next';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui';

interface DataAvailability {
  days_with_data: number;
  total_days: number;
  has_sufficient_data: boolean;
}

interface Props {
  lastCalculation: string | null;
  isCalculating: boolean;
  isLoadingData: boolean;
  currentWeekData: DataAvailability | null;
  previousWeekData: DataAvailability | null;
  currentWeekCanCalculate: boolean;
  onCalculateCurrent: () => void;
  onCalculatePreviousWeek: () => void;
}

function getDataIndicator(data: DataAvailability | null, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!data) return null;
  if (data.days_with_data === 0) return <span className="text-xs text-red-600 font-medium">{t('performance.noData')}</span>;
  if (data.days_with_data < 7) return <span className="text-xs text-orange-600 font-medium">{t('performance.daysData', { days: data.days_with_data })}</span>;
  return <span className="text-xs text-green-600 font-medium">✓ {t('performance.fullWeek')}</span>;
}

/** Displays performance-calculation status, data availability, and manual trigger actions. */
export function PerformanceStatusCard({
  lastCalculation, isCalculating, isLoadingData,
  currentWeekData, previousWeekData, currentWeekCanCalculate,
  onCalculateCurrent, onCalculatePreviousWeek,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">{t('performance.calculation')}</h3>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{t('performance.lastCalculated')}: {lastCalculation ?? t('performance.never')}</span>
        </div>
        <p className="text-xs text-gray-400">{t('performance.autoRuns')}</p>
      </div>

      {!isLoadingData && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{t('performance.currentWeekStatus')}:</span>
            <div className="flex items-center gap-2">
              {currentWeekData?.days_with_data === 0 ? <AlertCircle className="w-4 h-4 text-red-600" /> :
               currentWeekData?.days_with_data === 7 ? <CheckCircle className="w-4 h-4 text-green-600" /> :
               <AlertCircle className="w-4 h-4 text-orange-600" />}
              {getDataIndicator(currentWeekData, t)}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{t('performance.previousWeekStatus')}:</span>
            <div className="flex items-center gap-2">
              {previousWeekData?.days_with_data === 0 ? <AlertCircle className="w-4 h-4 text-red-600" /> :
               previousWeekData?.days_with_data === 7 ? <CheckCircle className="w-4 h-4 text-green-600" /> :
               <AlertCircle className="w-4 h-4 text-orange-600" />}
              {getDataIndicator(previousWeekData, t)}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onCalculateCurrent}
          disabled={isCalculating || !currentWeekCanCalculate || isLoadingData}
          title={isCalculating ? t('performance.calculationInProgress') : isLoadingData ? t('performance.loadingAvailability') : !currentWeekCanCalculate ? t('performance.insufficientData') : t('performance.calculateCurrentWeek')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!isCalculating && currentWeekCanCalculate && !isLoadingData ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'} disabled:opacity-50`}
        >
          {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isCalculating ? t('performance.calculating') : t('performance.calculateCurrentWeek')}
        </button>
        <button
          onClick={onCalculatePreviousWeek}
          disabled={isCalculating || isLoadingData}
          title={isCalculating ? t('performance.calculationInProgress') : isLoadingData ? t('performance.loadingAvailability') : t('performance.reviewDataBeforeCalculating')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!isCalculating && !isLoadingData ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-400 text-white cursor-not-allowed'} disabled:opacity-50`}
        >
          {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isCalculating ? t('performance.calculating') : t('performance.calculatePreviousWeek')}
        </button>
      </div>
    </Card>
  );
}
