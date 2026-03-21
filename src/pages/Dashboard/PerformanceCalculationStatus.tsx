import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { Card } from '../../components/ui';

export default function PerformanceCalculationStatus() {
  const { showNotification } = useNotification();
  const [lastCalculation, setLastCalculation] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const fetchLastCalculation = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_last_performance_calculation_time');
        if (!error && data) {
          setLastCalculation(new Date(data as string).toLocaleString());
        }
      } catch {
        // Function may not exist yet if migration hasn't run
      }
    };
    fetchLastCalculation();
  }, []);

  const getWeekStart = (date: Date, offsetWeeks = 0): string => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const daysToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToMonday - offsetWeeks * 7);
    return d.toISOString().split('T')[0];
  };

  const handleManualTrigger = async (targetWeek: 'current' | 'previous') => {
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

      const now = new Date().toLocaleString();
      setLastCalculation(now);
      showNotification('success', `Performance calculated for week starting ${weekStart}`);
    } catch (_err) {
      showNotification('error', 'Failed to calculate performance: ' + (_err as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">Performance Calculation</h3>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>Last calculated: {lastCalculation ?? 'Never'}</span>
        </div>
        <p className="text-xs text-gray-400">
          Auto-runs every Monday at 00:05 UTC. Use "Current Week" to see live data.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleManualTrigger('current')}
          disabled={isCalculating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {isCalculating ? 'Calculating...' : 'Calculate Current Week'}
        </button>
        <button
          onClick={() => handleManualTrigger('previous')}
          disabled={isCalculating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isCalculating ? 'Calculating...' : 'Calculate Previous Week'}
        </button>
      </div>
    </Card>
  );
}
