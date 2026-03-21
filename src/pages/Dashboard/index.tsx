import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend, Tooltip as PieTooltip } from 'recharts';
import { isWidgetVisible, getVisibleQuickActions } from '../../services/dashboardConfig';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';
import { PageSpinner, PageHeader, Card } from '../../components/ui';
import { useDashboard } from './useDashboard';
import StatCards from './StatCards';
import EmployeeOfWeekWidget from './EmployeeOfWeekWidget';
import PerformanceChartWidget from './PerformanceChartWidget';
import PerformanceCalculationStatus from './PerformanceCalculationStatus';

const LEAVE_COLORS = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444' };

export default function Dashboard() {
  const { stats, recentActivities, departmentData, leaveStatusData, loading, user } = useDashboard();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userRole = user?.role || 'staff';

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.welcome', { appName: t('auth.employeeManagementSystem') })} />

      <StatCards stats={stats} userRole={userRole} />

      {isWidgetVisible('announcements', userRole) && (
        <AnnouncementsWidget />
      )}

      {/* Employee of the Week and Performance Chart */}
      {(isWidgetVisible('employeeOfWeek', userRole) || isWidgetVisible('performanceChart', userRole)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetVisible('employeeOfWeek', userRole) && (
            <EmployeeOfWeekWidget />
          )}
          {isWidgetVisible('performanceChart', userRole) && (
            <PerformanceChartWidget />
          )}
        </div>
      )}

      {(isWidgetVisible('departmentChart', userRole) || isWidgetVisible('leaveChart', userRole)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetVisible('departmentChart', userRole) && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.employeesByDept')}</h2>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">{t('dashboard.noDeptData')}</p>
                </div>
              )}
            </Card>
          )}
          {isWidgetVisible('leaveChart', userRole) && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.leaveStatusDist')}</h2>
              {leaveStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={leaveStatusData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80} fill="#8884d8" dataKey="value">
                      {leaveStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={LEAVE_COLORS[entry.name as keyof typeof LEAVE_COLORS]} />
                      ))}
                    </Pie>
                    <PieTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">{t('dashboard.noLeaveData')}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isWidgetVisible('recentActivities', userRole) && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.recentActivities')}</h2>
            <div className="space-y-3 sm:space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-100 last:border-0">
                    <div className="bg-primary-100 p-1.5 sm:p-2 rounded-lg shrink-0">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-900 break-words">{activity.action}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm">{t('dashboard.noRecentActivities')}</p>
              )}
            </div>
          </Card>
        )}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {getVisibleQuickActions(userRole as any).map((action) => {
              const iconMap: { [key: string]: any } = { Users, Calendar, Clock, TrendingUp };
              const colorMap: { [key: string]: string } = {
                blue: 'bg-primary-50 hover:bg-primary-100 text-primary-900',
                green: 'bg-green-50 hover:bg-green-100 text-green-900',
                teal: 'bg-teal-50 hover:bg-teal-100 text-teal-900',
                orange: 'bg-orange-50 hover:bg-orange-100 text-orange-900',
              };
              const Icon = iconMap[action.icon];
              return (
                <button key={action.id} onClick={() => navigate(action.to)}
                  className={`p-3 sm:p-4 ${colorMap[action.color]} rounded-lg text-left transition-all duration-200 group`}>
                  <div className="flex items-start justify-between">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{action.label}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Admin-only: manual performance calculation trigger */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PerformanceCalculationStatus />
        </div>
      )}
    </div>
  );
}
