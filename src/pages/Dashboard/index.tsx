import { useTranslation } from 'react-i18next';
import { isWidgetVisible } from '../../lib/dashboardConfig';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';
import { PageSpinner, PageHeader } from '../../components/ui';
import { useDashboard } from './useDashboard';
import StatCards from './StatCards';
import DepartmentChart from './DepartmentChart';
import LeaveChart from './LeaveChart';
import RecentActivities from './RecentActivities';
import QuickActions from './QuickActions';

export default function Dashboard() {
  const { stats, recentActivities, departmentData, leaveStatusData, loading, user } = useDashboard();
  const { t } = useTranslation();
  const userRole = user?.role || 'staff';

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.welcome')} />

      <StatCards stats={stats} userRole={userRole} />

      {isWidgetVisible('announcements', userRole) && (
        <AnnouncementsWidget />
      )}

      {(isWidgetVisible('departmentChart', userRole) || isWidgetVisible('leaveChart', userRole)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetVisible('departmentChart', userRole) && (
            <DepartmentChart departmentData={departmentData} />
          )}
          {isWidgetVisible('leaveChart', userRole) && (
            <LeaveChart leaveStatusData={leaveStatusData} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isWidgetVisible('recentActivities', userRole) && (
          <RecentActivities activities={recentActivities} />
        )}
        <QuickActions userRole={userRole} />
      </div>
    </div>
  );
}
