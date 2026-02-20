import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import type { RecentActivity } from './types';

interface RecentActivitiesProps {
  activities: RecentActivity[];
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.recentActivities')}</h2>
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
              <div className="bg-primary-100 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-primary-900" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">{t('dashboard.noRecentActivities')}</p>
        )}
      </div>
    </div>
  );
}
