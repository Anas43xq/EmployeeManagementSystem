import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeName } from '../../hooks';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';


export function UserMenu({ onSignOut, isRTL }: { onSignOut: () => void; isRTL: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { name } = useEmployeeName(user?.employeeId ?? null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {name.firstName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-left hidden xl:block">
          <p className="text-xs font-medium text-gray-800 leading-none">{name.firstName} {name.lastName}</p>
          <p className="text-[10px] text-gray-500 capitalize mt-0.5">{user?.role}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-[100] transition-all duration-200 origin-top ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 mx-1 rounded-lg transition-colors"
          onClick={() => setOpen(false)}
        >
          <User className="w-4 h-4" />
          {t('nav.myProfile')}
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 mx-1 rounded-lg transition-colors"
          onClick={() => setOpen(false)}
        >
          <Settings className="w-4 h-4" />
          {t('nav.settings')}
        </Link>
        <hr className="my-1 border-gray-100" />
        <button
          onClick={() => { setOpen(false); onSignOut(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 mx-1 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('auth.signOut')}
        </button>
      </div>
    </div>
  );
}
