import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui';
import { useReports } from './useReports';
import ReportCardGrid from './ReportCardGrid';
import CustomReportPanel from './CustomReportPanel';

export default function Reports() {
  const { t } = useTranslation();
  const {
    departments,
    loading,
    selectedReport,
    setSelectedReport,
    dateRange,
    setDateRange,
    selectedDepartment,
    setSelectedDepartment,
    generateReport,
    generateCustomReport,
  } = useReports();

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />

      <ReportCardGrid loading={loading} onGenerate={generateReport} />

      <CustomReportPanel
        selectedReport={selectedReport}
        setSelectedReport={setSelectedReport}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        departments={departments}
        loading={loading}
        onGenerate={generateCustomReport}
      />
    </div>
  );
}
