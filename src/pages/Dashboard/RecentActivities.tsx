import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import type { RecentActivity } from './types';

interface RecentActivitiesProps {
  activities: RecentActivity[];
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.recentActivities')}</h2>
      <div className="space-y-3 sm:space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
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
    </div>
  );
}
