import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Star, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card } from '../../components/ui';
import { getEmployeeOfWeek } from '../../services/performanceQueries';
import type { EmployeeOfWeek } from '../../types';

export default function EmployeeOfWeekWidget() {
  const { t } = useTranslation();
  const [employeeOfWeek, setEmployeeOfWeek] = useState<EmployeeOfWeek | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeOfWeek();
  }, []);

  const loadEmployeeOfWeek = async () => {
    try {
      const data = await getEmployeeOfWeek();
      setEmployeeOfWeek(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </Card>
    );
  }

  if (!employeeOfWeek) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">{t('performance.employeeOfWeek')}</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>{t('performance.noEmployeeOfWeek')}</p>
        </div>
      </Card>
    );
  }

  const employee = employeeOfWeek.employees;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">{t('performance.employeeOfWeek')}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Employee Photo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 p-1">
            {employee?.photo_url ? (
              <img
                src={employee.photo_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-2xl font-bold text-yellow-600">
                  {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                </span>
              </div>
            )}
          </div>
          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
        </div>

        {/* Employee Info */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">
            {employee?.first_name} {employee?.last_name}
          </h3>
          <p className="text-sm text-gray-600">{employee?.position}</p>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {format(parseISO(employeeOfWeek.week_start), 'MMM d')} - {format(parseISO(employeeOfWeek.week_end), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Score Badge */}
        <div className="text-center">
          <div className="bg-yellow-400 text-yellow-900 rounded-full px-4 py-2">
            <span className="text-2xl font-bold">{employeeOfWeek.score}</span>
            <span className="text-xs block">{t('performance.points')}</span>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="mt-4 p-3 bg-white/60 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{t('performance.reason')}:</span> {employeeOfWeek.reason}
        </p>
      </div>
    </Card>
  );
}
