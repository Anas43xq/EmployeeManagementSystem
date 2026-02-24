import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import {
  Briefcase, LogOut, User, Globe, ChevronDown, Star,
  LayoutDashboard, Users, Building2, Clock, Calendar,
  ListTodo, AlertTriangle, MessageSquare, Calculator,
  Receipt, Megaphone, FileText, UserCog, Settings, Activity,
} from 'lucide-react';

/* ─── Navigation category definitions ─────────────────────────────────────── */
interface NavItem { name: string; href: string; icon: React.ElementType }
interface NavCategory { label: string; items: NavItem[]; roles: string[] }

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

/* ─── Per-role item filter ─────────────────────────────────────────────────── */
const ITEMS_BY_ROLE: Record<string, string[]> = {
  admin: ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports', '/users', '/activity-logs', '/settings'],
  hr:    ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports'],
  staff: ['/dashboard', '/profile', '/attendance', '/leaves', '/tasks', '/payslips', '/complaints', '/warnings'],
};

/* ─── Dropdown component ───────────────────────────────────────────────────── */
function NavDropdown({ category, role, isRTL }: { category: NavCategory; role: string; isRTL: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowed = ITEMS_BY_ROLE[role] ?? [];
  const items = category.items.filter(i => allowed.includes(i.href));
  if (items.length === 0) return null;

  const isActive = items.some(i => location.pathname.startsWith(i.href));

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 100);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative ${
          isActive
            ? 'text-primary-700'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {/* Underline indicator */}
        <span className="relative">
          {category.label}
          <span
            className={`absolute -bottom-1 left-0 h-0.5 bg-primary-600 rounded-full transition-all duration-200 ${
              isActive ? 'w-full' : 'w-0 group-hover:w-full'
            }`}
          />
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transition-all duration-200 origin-top ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {category.label}
        </p>
        {items.map(item => {
          const isItemActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors mx-1 rounded-lg ${
                isItemActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── User avatar dropdown ─────────────────────────────────────────────────── */
function UserMenu({ onSignOut, isRTL }: { onSignOut: () => void; isRTL: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click — works across all pages regardless of z-index
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
            {user?.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-left hidden xl:block">
          <p className="text-xs font-medium text-gray-800 leading-none">{user?.email}</p>
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

/* ─── Main Navbar ──────────────────────────────────────────────────────────── */
export default function Navbar({ onSignOut, totalPoints }: { onSignOut: () => void; totalPoints: number | null }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);
  const categories = useNavCategories();
  const role = user?.role || 'staff';

  // Set --navbar-height CSS variable
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

  // Scroll hide / show  
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current <= 10) {
        setVisible(true);
      } else if (current > lastScrollY.current) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true);  // scrolling up
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
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex items-center justify-between px-6 h-14 gap-4">
        {/* Logo */}
        <Link to="/dashboard" className={`flex items-center shrink-0 ${isRTL ? 'gap-x-3 flex-row-reverse' : 'gap-x-3'}`}>
          <div className="bg-primary-900 p-1.5 rounded-lg">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-primary-900 text-sm tracking-tight hidden xl:block">
            {t('auth.employeeManagementSystem')}
          </span>
        </Link>

        {/* Categories */}
        <div className={`flex items-center gap-0.5 flex-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
          {categories.map(cat => (
            <NavDropdown key={cat.label} category={cat} role={role} isRTL={isRTL} />
          ))}
        </div>

        {/* Right controls */}
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
