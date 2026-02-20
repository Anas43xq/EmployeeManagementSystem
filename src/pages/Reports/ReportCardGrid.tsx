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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-4">
            <div className={`${report.color} p-3 rounded-lg`}>
              <report.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <button
                onClick={() => onGenerate(report.id)}
                disabled={loading}
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span className="text-sm">{t('reports.generatingReport')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{t('reports.generateReport')}</span>
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
