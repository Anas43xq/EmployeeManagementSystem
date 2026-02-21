import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { getVisibleQuickActions } from '../../services/dashboardConfig';

interface QuickActionsProps {
  userRole: string;
}

export default function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = getVisibleQuickActions(userRole as any);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.quickActions')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {actions.map((action) => {
          const iconMap: { [key: string]: any } = {
            Users,
            Calendar,
            Clock,
            TrendingUp,
          };
          const Icon = iconMap[action.icon];
          const colorMap: { [key: string]: string } = {
            blue: 'bg-primary-50 hover:bg-primary-100 text-primary-900',
            green: 'bg-green-50 hover:bg-green-100 text-green-900',
            teal: 'bg-teal-50 hover:bg-teal-100 text-teal-900',
            orange: 'bg-orange-50 hover:bg-orange-100 text-orange-900',
          };
          
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.to)}
              className={`p-3 sm:p-4 ${colorMap[action.color]} rounded-lg text-left transition-all duration-200 group`}
            >
              <div className="flex items-start justify-between">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{action.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
