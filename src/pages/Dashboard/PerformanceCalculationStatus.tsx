import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { Card } from '../../components/ui';
import DataAvailabilityModal from '../../components/DataAvailabilityModal';
import { getWeeklyDataAvailability } from '../../services/performanceQueries';

interface DataAvailability {
  days_with_data: number;
  total_days: number;
  has_sufficient_data: boolean;
}

export default function PerformanceCalculationStatus() {
  const { showNotification } = useNotification();
  const { t } = useTranslation();
  const [lastCalculation, setLastCalculation] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentWeekData, setCurrentWeekData] = useState<DataAvailability | null>(null);
  const [previousWeekData, setPreviousWeekData] = useState<DataAvailability | null>(null);
  const [showPreviousWeekModal, setShowPreviousWeekModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch last calculation timestamp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_last_performance_calculation_time');
        if (!error && data) {
          setLastCalculation(new Date(data as string).toLocaleString('en-GB'));
        }

        // Fetch data availability for current and previous week
        const today = new Date();
        const currentWeekStart = getWeekStart(today, 0);
        const previousWeekStart = getWeekStart(today, 1);

        const [currentData, previousData] = await Promise.all([
          getWeeklyDataAvailability(currentWeekStart),
          getWeeklyDataAvailability(previousWeekStart),
        ]);

        setCurrentWeekData(currentData);
        setPreviousWeekData(previousData);
      } catch {
        // Function may not exist yet if migration hasn't run
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchInitialData();
  }, []);

  const getWeekStart = (date: Date, offsetWeeks = 0): string => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const daysToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToMonday - offsetWeeks * 7);
    return d.toISOString().split('T')[0];
  };

  const handleManualTrigger = async (targetWeek: 'current' | 'previous') => {
    // Spam prevention - don't allow if already calculating
    if (isCalculating) {
      showNotification('warning', t('performance.spamWarning'));
      return;
    }

    setIsCalculating(true);
    try {
      const today = new Date();
      const weekStart = getWeekStart(today, targetWeek === 'previous' ? 1 : 0);

      const { error: perfError } = await supabase.rpc('calculate_weekly_performance', {
        p_week_start: weekStart,
      });
      if (perfError) throw perfError;

      const { error: eowError } = await supabase.rpc('select_employee_of_week', {
        p_week_start: weekStart,
      });
      if (eowError) throw eowError;

      const now = new Date().toLocaleString('en-GB');
      setLastCalculation(now);
      showNotification('success', t('performance.calculated', { weekStart }));

      // Refresh data availability after calculation
      const [currentData, previousData] = await Promise.all([
        getWeeklyDataAvailability(getWeekStart(today, 0)),
        getWeeklyDataAvailability(getWeekStart(today, 1)),
      ]);
      setCurrentWeekData(currentData);
      setPreviousWeekData(previousData);
    } catch (_err) {
      showNotification('error', t('performance.failedToCalculate') + ': ' + (_err as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePreviousWeekClick = () => {
    // Spam prevention - don't allow if already calculating
    if (isCalculating) {
      showNotification('warning', t('performance.spamWarning'));
      return;
    }
    setShowPreviousWeekModal(true);
  };

  const handleProceedPreviousWeek = async () => {
    setModalLoading(true);
    try {
      await handleManualTrigger('previous');
      setShowPreviousWeekModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const currentWeekCanCalculate = currentWeekData?.has_sufficient_data ?? false;

  const getDataIndicator = (data: DataAvailability | null) => {
    if (!data) return null;

    if (data.days_with_data === 0) {
      return <span className="text-xs text-red-600 font-medium">{t('performance.noData')}</span>;
    }

    if (data.days_with_data < 7) {
      return (
        <span className="text-xs text-orange-600 font-medium">
          {t('performance.daysData', { days: data.days_with_data })}
        </span>
      );
    }

    return <span className="text-xs text-green-600 font-medium">✓ {t('performance.fullWeek')}</span>;
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">{t('performance.calculation')}</h3>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {t('performance.lastCalculated')}: {lastCalculation ?? t('performance.never')}
            </span>
          </div>
          <p className="text-xs text-gray-400">{t('performance.autoRuns')}</p>
        </div>

        {/* Data Availability Status */}
        {!isLoadingData && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{t('performance.currentWeekStatus')}:</span>
              <div className="flex items-center gap-2">
                {currentWeekData?.days_with_data === 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : currentWeekData?.days_with_data === 7 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                )}
                {getDataIndicator(currentWeekData)}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{t('performance.previousWeekStatus')}:</span>
              <div className="flex items-center gap-2">
                {previousWeekData?.days_with_data === 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : previousWeekData?.days_with_data === 7 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                )}
                {getDataIndicator(previousWeekData)}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleManualTrigger('current')}
            disabled={isCalculating || !currentWeekCanCalculate || isLoadingData}
            title={
              isCalculating
                ? t('performance.calculationInProgress')
                : isLoadingData
                  ? t('performance.loadingAvailability')
                  : !currentWeekCanCalculate
                    ? t('performance.insufficientData')
                    : t('performance.calculateCurrentWeek')
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isCalculating && currentWeekCanCalculate && !isLoadingData
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {isCalculating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isCalculating ? t('performance.calculating') : t('performance.calculateCurrentWeek')}
          </button>
          <button
            onClick={handlePreviousWeekClick}
            disabled={isCalculating || isLoadingData}
            title={
              isCalculating
                ? t('performance.calculationInProgress')
                : isLoadingData
                  ? t('performance.loadingAvailability')
                  : t('performance.reviewDataBeforeCalculating')
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isCalculating && !isLoadingData
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {isCalculating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isCalculating ? t('performance.calculating') : t('performance.calculatePreviousWeek')}
          </button>
        </div>
      </Card>

      {/* Data Availability Modal for Previous Week */}
      {showPreviousWeekModal && previousWeekData && (
        <DataAvailabilityModal
          weekStart={getWeekStart(new Date(), 1)}
          daysWithData={previousWeekData.days_with_data}
          onProceed={handleProceedPreviousWeek}
          onCancel={() => setShowPreviousWeekModal(false)}
          isLoading={modalLoading}
        />
      )}
    </>
  );
}
