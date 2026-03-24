import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import DataAvailabilityModal from '../../components/DataAvailabilityModal';
import {
  getWeeklyDataAvailability,
  getLastPerformanceCalculationTime,
  calculateWeeklyPerformance,
  selectEmployeeOfWeek,
} from '../../services/performance';
import { PerformanceStatusCard } from './PerformanceStatusCard';

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
        const lastRun = await getLastPerformanceCalculationTime();
        if (lastRun) setLastCalculation(new Date(lastRun).toLocaleString('en-GB'));

        const today = new Date();
        const [currentData, previousData] = await Promise.all([
          getWeeklyDataAvailability(getWeekStart(today, 0)),
          getWeeklyDataAvailability(getWeekStart(today, 1)),
        ]);
        setCurrentWeekData(currentData);
        setPreviousWeekData(previousData);
      } catch { /* migration may not have run yet */ } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, []);

  const getWeekStart = (date: Date, offsetWeeks = 0): string => {
    const d = new Date(date);
    const day = d.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToMonday - offsetWeeks * 7);
    return d.toISOString().split('T')[0];
  };

  const handleManualTrigger = async (targetWeek: 'current' | 'previous') => {
    if (isCalculating) { showNotification('warning', t('performance.spamWarning')); return; }
    setIsCalculating(true);
    try {
      const today = new Date();
      const weekStart = getWeekStart(today, targetWeek === 'previous' ? 1 : 0);
      await calculateWeeklyPerformance(weekStart);
      await selectEmployeeOfWeek(weekStart);
      setLastCalculation(new Date().toLocaleString('en-GB'));
      showNotification('success', t('performance.calculated', { weekStart }));
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
    if (isCalculating) { showNotification('warning', t('performance.spamWarning')); return; }
    setShowPreviousWeekModal(true);
  };

  const handleProceedPreviousWeek = async () => {
    setModalLoading(true);
    try { await handleManualTrigger('previous'); setShowPreviousWeekModal(false); }
    finally { setModalLoading(false); }
  };

  return (
    <>
      <PerformanceStatusCard
        lastCalculation={lastCalculation}
        isCalculating={isCalculating}
        isLoadingData={isLoadingData}
        currentWeekData={currentWeekData}
        previousWeekData={previousWeekData}
        currentWeekCanCalculate={currentWeekData?.has_sufficient_data ?? false}
        onCalculateCurrent={() => handleManualTrigger('current')}
        onCalculatePreviousWeek={handlePreviousWeekClick}
      />
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
