import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import type { Department, ReportType } from './types';

interface CustomReportPanelProps {
  selectedReport: ReportType;
  setSelectedReport: (value: ReportType) => void;
  dateRange: string;
  setDateRange: (value: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  departments: Department[];
  loading: boolean;
  onGenerate: () => void;
}

export default function CustomReportPanel({
  selectedReport,
  setSelectedReport,
  dateRange,
  setDateRange,
  selectedDepartment,
  setSelectedDepartment,
  departments,
  loading,
  onGenerate,
}: CustomReportPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('reports.customReport')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.reportType')}</label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value as ReportType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="employee">{t('reports.employeeReportOption')}</option>
            <option value="leave">{t('reports.leaveReportOption')}</option>
            <option value="attendance">{t('reports.attendanceReportOption')}</option>
            <option value="department">{t('reports.departmentReportOption')}</option>
            <option value="payroll">{t('reports.payrollReportOption')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.dateRange')}</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">{t('reports.last7Days')}</option>
            <option value="30">{t('reports.last30Days')}</option>
            <option value="90">{t('reports.last3Months')}</option>
            <option value="365">{t('reports.lastYear')}</option>
            <option value="all">{t('reports.allTime')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.department')}</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('reports.allDepartments')}</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="mt-6 flex items-center space-x-2 bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>{t('reports.generatingReport')}</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>{t('reports.generateCustomReport')}</span>
          </>
        )}
      </button>
    </div>
  );
}
