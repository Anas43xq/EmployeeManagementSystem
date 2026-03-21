import { useTranslation } from 'react-i18next';
import {
  UserCog,
  ShieldAlert,
  ShieldCheck,
  Shield,
  UserPlus,
} from 'lucide-react';
import { StatsCard } from '../../components/ui';

interface UserStatsCardsProps {
  stats: {
    total: number;
    admins: number;
    hr: number;
    employees: number;
    withoutAccess: number;
  };
}

export default function UserStatsCards({ stats }: UserStatsCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatsCard label={t('userManagement.totalUsers')} value={stats.total} Icon={UserCog} iconClassName="w-8 h-8 text-gray-400" />
      <StatsCard label={t('userManagement.admins')} value={stats.admins} Icon={ShieldAlert} iconClassName="w-8 h-8 text-red-400" valueClassName="text-2xl font-bold text-red-600" />
      <StatsCard label={t('userManagement.hrStaff')} value={stats.hr} Icon={ShieldCheck} iconClassName="w-8 h-8 text-purple-400" valueClassName="text-2xl font-bold text-purple-600" />
      <StatsCard label={t('userManagement.employees')} value={stats.employees} Icon={Shield} iconClassName="w-8 h-8 text-primary-400" valueClassName="text-2xl font-bold text-primary-600" />
      <StatsCard label={t('userManagement.withoutAccess')} value={stats.withoutAccess} Icon={UserPlus} iconClassName="w-8 h-8 text-amber-400" valueClassName="text-2xl font-bold text-amber-600" />
    </div>
  );
}
