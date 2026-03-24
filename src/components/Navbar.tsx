import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import { NavDropdown } from './navbar/NavDropdown';
import type { NavCategory } from './navbar/navConfig';
import { UserMenu } from './navbar/UserMenu';
import {
  Briefcase, Globe, Star,
  LayoutDashboard, Users, Building2, Clock, Calendar,
  ListTodo, AlertTriangle, MessageSquare, Calculator,
  Receipt, Megaphone, FileText, UserCog, Settings, Activity, User,
} from 'lucide-react';

function useNavCategories(): NavCategory[] {
  const { t } = useTranslation();
  return [
    {
      label: t('navCategory.overview', 'OVERVIEW'),
      roles: ['admin', 'hr', 'staff'],
      items: [
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.myProfile'), href: '/profile', icon: User },
      ],
    },
    {
      label: t('navCategory.workforce', 'WORKFORCE'),
      roles: ['admin', 'hr', 'staff'],
      items: [
        { name: t('nav.employees'), href: '/employees', icon: Users },
        { name: t('nav.departments'), href: '/departments', icon: Building2 },
        { name: t('nav.attendance'), href: '/attendance', icon: Clock },
      ],
    },
    {
      label: t('navCategory.operations', 'OPERATIONS'),
      roles: ['admin', 'hr', 'staff'],
      items: [
        { name: t('nav.leaveManagement'), href: '/leaves', icon: Calendar },
        { name: t('nav.tasks'), href: '/tasks', icon: ListTodo },
        { name: t('nav.payroll', 'Payroll'), href: '/payroll', icon: Calculator },
        { name: t('nav.myPayslips', 'My Payslips'), href: '/payslips', icon: Receipt },
      ],
    },
    {
      label: t('navCategory.communication', 'COMMUNICATION'),
      roles: ['admin', 'hr', 'staff'],
      items: [
        { name: t('nav.announcements'), href: '/announcements', icon: Megaphone },
        { name: t('nav.complaints'), href: '/complaints', icon: MessageSquare },
        { name: t('nav.warnings'), href: '/warnings', icon: AlertTriangle },
        { name: t('nav.reports'), href: '/reports', icon: FileText },
      ],
    },
    {
      label: t('navCategory.system', 'SYSTEM'),
      roles: ['admin'],
      items: [
        { name: t('nav.userManagement'), href: '/users', icon: UserCog },
        { name: t('nav.activityLogs', 'Activity Logs'), href: '/activity-logs', icon: Activity },
        { name: t('nav.settings'), href: '/settings', icon: Settings },
      ],
    },
  ];
}

export default function Navbar({ onSignOut, totalPoints }: { onSignOut: () => void; totalPoints: number | null }) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);
  const categories = useNavCategories();
  const role = user?.role || 'staff';

  useEffect(() => {
    const update = () => {
      if (navRef.current) {
        document.documentElement.style.setProperty(
          '--navbar-height',
          `${navRef.current.getBoundingClientRect().height}px`
        );
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current <= 10) {
        setVisible(true);
      } else if (current > lastScrollY.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  return (
    <nav
      ref={navRef}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex items-center justify-between px-6 h-14 gap-4">
        <Link to="/dashboard" className={`flex items-center shrink-0 ${isRTL ? 'gap-x-3 flex-row-reverse' : 'gap-x-3'}`}>
          <div className="bg-primary-900 p-1.5 rounded-lg">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-primary-900 text-sm tracking-tight hidden xl:block">
            {i18n.t('auth.employeeManagementSystem')}
          </span>
        </Link>

        <div className={`flex items-center gap-0.5 flex-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
          {categories.map(cat => (
            <NavDropdown key={cat.label} category={cat} role={role} isRTL={isRTL} />
          ))}
        </div>

        <div className={`flex items-center shrink-0 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {totalPoints !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {totalPoints}
            </div>
          )}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs">{isRTL ? 'EN' : 'ع'}</span>
          </button>
          <NotificationCenter />
          <UserMenu onSignOut={onSignOut} isRTL={isRTL} />
        </div>
      </div>
    </nav>
  );
}
