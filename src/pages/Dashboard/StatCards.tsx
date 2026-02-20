import { useTranslation } from 'react-i18next';
import { Users, Building2, Calendar, CheckCircle, UserCheck, XCircle } from 'lucide-react';
import { isWidgetVisible } from '../../services/dashboardConfig';
import type { Stats } from './types';

interface StatCardsProps {
  stats: Stats;
  userRole: string;
}

export default function StatCards({ stats, userRole }: StatCardsProps) {
  const { t } = useTranslation();

  const allStatCards = [
    { id: 'totalEmployees', name: t('dashboard.totalEmployees'), value: stats.totalEmployees, icon: Users, color: 'bg-primary-500' },
    { id: 'activeEmployees', name: t('dashboard.activeEmployees'), value: stats.activeEmployees, icon: CheckCircle, color: 'bg-green-500' },
    { id: 'departments', name: t('dashboard.departments'), value: stats.totalDepartments, icon: Building2, color: 'bg-teal-500' },
    { id: 'pendingLeaves', name: t('dashboard.pendingLeaves'), value: stats.pendingLeaves, icon: Calendar, color: 'bg-orange-500' },
    { id: 'todayAttendance', name: t('dashboard.todayAttendance'), value: stats.todayAttendance, icon: UserCheck, color: 'bg-cyan-500' },
    { id: 'approvedLeaves', name: t('dashboard.approvedLeaves'), value: stats.approvedLeaves, icon: CheckCircle, color: 'bg-emerald-500' },
    { id: 'rejectedLeaves', name: t('dashboard.rejectedLeaves'), value: stats.rejectedLeaves, icon: XCircle, color: 'bg-red-500' },
  ];

  const statCards = allStatCards.filter(card => isWidgetVisible(card.id, userRole as any));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat: any) => (
        <div key={stat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
