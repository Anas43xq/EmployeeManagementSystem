import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Award, Users } from 'lucide-react';
import { Card } from '../../components/ui';
import { getTopPerformers } from '../../lib/performanceQueries';
import type { EmployeePerformance } from '../../lib/types';

export default function PerformanceChartWidget() {
  const { t } = useTranslation();
  const [topPerformers, setTopPerformers] = useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopPerformers();
  }, []);

  const loadTopPerformers = async () => {
    try {
      const data = await getTopPerformers();
      setTopPerformers(data.slice(0, 5)); // Top 5 performers
    } catch (error) {
      console.error('Error loading top performers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </Card>
    );
  }

  const maxScore = Math.max(...topPerformers.map(p => p.total_score), 100);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('performance.topPerformers')}</h2>
        </div>
        <span className="text-sm text-gray-500">{t('performance.thisWeek')}</span>
      </div>

      {topPerformers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>{t('performance.noPerformanceData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topPerformers.map((performer, index) => {
            const employee = performer.employees;
            const percentage = (performer.total_score / maxScore) * 100;
            
            return (
              <div key={performer.id} className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {index === 0 ? <Award className="w-4 h-4" /> : index + 1}
                </div>

                {/* Employee Info */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  {employee?.photo_url ? (
                    <img
                      src={employee.photo_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {employee?.first_name} {employee?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{employee?.position}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                        'bg-gradient-to-r from-blue-400 to-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {performer.total_score} {t('performance.pts')}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right text-xs text-gray-500 min-w-[80px]">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-green-600">✓{performer.tasks_completed}</span>
                    <span>/</span>
                    <span className="text-red-600">✗{performer.tasks_overdue}</span>
                  </div>
                  <div className="text-gray-400">
                    {t('performance.attendance')}: {performer.attendance_days}d
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>{t('performance.tasksCompleted')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>{t('performance.tasksOverdue')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>{t('performance.attendanceDays')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
