import { useTranslation } from 'react-i18next';
import { Download, Users, Calendar, Clock, DollarSign } from 'lucide-react';
import type { ReportType } from './types';

interface ReportCardGridProps {
  loading: boolean;
  onGenerate: (type: ReportType) => void;
}

export default function ReportCardGrid({ loading, onGenerate }: ReportCardGridProps) {
  const { t } = useTranslation();

  const reports = [
    {
      id: 'employee' as ReportType,
      name: t('reports.employeeReport'),
      description: t('reports.employeeReportDesc'),
      icon: Users,
      color: 'bg-primary-500',
    },
    {
      id: 'leave' as ReportType,
      name: t('reports.leaveReport'),
      description: t('reports.leaveReportDesc'),
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      id: 'attendance' as ReportType,
      name: t('reports.attendanceReport'),
      description: t('reports.attendanceReportDesc'),
      icon: Clock,
      color: 'bg-cyan-500',
    },
    {
      id: 'department' as ReportType,
      name: t('reports.departmentReport'),
      description: t('reports.departmentReportDesc'),
      icon: Users,
      color: 'bg-teal-500',
    },
    {
      id: 'payroll' as ReportType,
      name: t('reports.payrollReport'),
      description: t('reports.payrollReportDesc'),
      icon: DollarSign,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {reports.map((report) => (
        <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow overflow-hidden">
          <div className="flex items-start gap-3">
            <div className={`${report.color} p-2 sm:p-3 rounded-lg shrink-0`}>
              <report.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 truncate">{report.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{report.description}</p>
              <button
                onClick={() => onGenerate(report.id)}
                disabled={loading}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-primary-600"></div>
                    <span className="text-xs sm:text-sm">{t('reports.generatingReport')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">{t('reports.generateReport')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
