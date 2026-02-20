import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { Megaphone, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

const PRIORITY_CONFIG = {
  low: { labelKey: 'announcements.low', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Info },
  normal: { labelKey: 'announcements.medium', color: 'bg-primary-50 text-primary-700 border-primary-200', icon: Bell },
  high: { labelKey: 'announcements.high', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  urgent: { labelKey: 'announcements.urgent', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
};

export default function AnnouncementsWidget() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await (supabase
        .from('announcements')
        .select('id, title, content, priority, created_at')
        .match({ is_active: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6) as any) as { data: Announcement[] | null; error: any };

      if (error) throw error;

      setAnnouncements(data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedAnnouncements = [...announcements].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-primary-900 p-2 rounded-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('announcements.latestNews')}</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-primary-900 p-2 rounded-lg">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('announcements.latestNews')}</h2>
          <p className="text-sm text-gray-500">{t('announcements.latestNews')}</p>
        </div>
      </div>

      {sortedAnnouncements.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{t('announcements.noAnnouncementsNow')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('announcements.checkBackLater')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedAnnouncements.map((announcement) => {
            const priorityConfig = PRIORITY_CONFIG[announcement.priority];
            const PriorityIcon = priorityConfig.icon;

            return (
              <div
                key={announcement.id}
                className={`p-5 rounded-lg border-2 ${priorityConfig.color} transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start space-x-3">
                  <PriorityIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base">{announcement.title}</h3>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{announcement.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${priorityConfig.color}`}>
                        {t(priorityConfig.labelKey)}
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
