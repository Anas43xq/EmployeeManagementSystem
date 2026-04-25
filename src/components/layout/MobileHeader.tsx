import { useTranslation } from 'react-i18next';
import NotificationCenter from '../NotificationCenter';
import { Briefcase, Globe, Menu, Star } from 'lucide-react';

interface Props {
  totalPoints: number | null;
  onMenuOpen: () => void;
}


export function MobileHeader({ totalPoints, onMenuOpen }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={onMenuOpen}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className={`flex items-center gap-2 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
          <Briefcase className="w-4 h-4 text-primary-900 shrink-0" />
          <span className="font-bold text-primary-900 text-sm truncate hidden sm:block">{t('auth.employeeManagementSystem')}</span>
        </div>

        <div className={`flex items-center gap-1.5 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {totalPoints !== null && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {totalPoints}
            </div>
          )}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-0.5 px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs">{isRTL ? 'EN' : 'ع'}</span>
          </button>
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
