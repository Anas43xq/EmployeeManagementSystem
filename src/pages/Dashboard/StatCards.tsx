import { useTranslation } from 'react-i18next';
import { Users, Building2, Calendar, CheckCircle, UserCheck, XCircle } from 'lucide-react';
import { isWidgetVisible } from '../../services/dashboardConfig';
import { StatsCard } from '../../components/ui';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statCards = allStatCards.filter(card => isWidgetVisible(card.id, userRole as any));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {statCards.map((stat: unknown) => {
        const s = stat as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return (
          <StatsCard
            key={s.id}
            label={s.name}
            value={s.value}
            Icon={s.icon}
            iconBg={s.color}
            iconClassName="w-4 h-4 sm:w-6 sm:h-6 text-white"
            className="p-3 sm:p-6 hover:shadow-md transition-shadow"
          />
        );
      })}
    </div>
  );
}
