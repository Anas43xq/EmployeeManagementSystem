import { useTranslation } from 'react-i18next';
import { Edit2, Trash2 } from 'lucide-react';
import type { Announcement } from './types';
import type { LucideIcon } from 'lucide-react';

interface PriorityConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  priorityConfig: PriorityConfig;
  onToggleActive: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
}

export default function AnnouncementCard({
  announcement,
  priorityConfig,
  onToggleActive,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  const { t } = useTranslation();
  const PriorityIcon = priorityConfig.icon;
  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-hidden ${
        !announcement.is_active || isExpired ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{announcement.title}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
              <PriorityIcon className="w-3 h-3 mr-1" />
              {priorityConfig.label}
            </span>
            {!announcement.is_active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {t('announcements.inactive')}
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                {t('announcements.expired')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{announcement.content}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-500">
            <span>{t('announcements.created')}: {new Date(announcement.created_at).toLocaleDateString()}</span>
            {announcement.expires_at && (
              <span>{t('announcements.expires')}: {new Date(announcement.expires_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleActive(announcement)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              announcement.is_active
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {announcement.is_active ? t('announcements.deactivate') : t('announcements.activate')}
          </button>
          <button
            onClick={() => onEdit(announcement)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title={t('common.edit')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(announcement.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
