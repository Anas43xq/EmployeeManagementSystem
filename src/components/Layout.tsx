import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import { getMyTotalPoints } from '../services/performanceQueries';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Clock,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  Megaphone,
  UserCog,
  Globe,
  User,
  Calculator,
  Receipt,
  ListTodo,
  AlertTriangle,
  MessageSquare,
  Star,
} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Fetch points for all users
  useEffect(() => {
    if (user?.employeeId) {
      getMyTotalPoints(user.employeeId)
        .then(setTotalPoints)
        .catch(() => setTotalPoints(0));
    }
  }, [user?.employeeId]);

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.myProfile'), href: '/profile', icon: User, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.employees'), href: '/employees', icon: Users, roles: ['admin', 'hr'] },
    { name: t('nav.departments'), href: '/departments', icon: Building2, roles: ['admin', 'hr'] },
    { name: t('nav.leaveManagement'), href: '/leaves', icon: Calendar, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.attendance'), href: '/attendance', icon: Clock, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.tasks'), href: '/tasks', icon: ListTodo, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.warnings'), href: '/warnings', icon: AlertTriangle, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.complaints'), href: '/complaints', icon: MessageSquare, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.payroll', 'Payroll'), href: '/payroll', icon: Calculator, roles: ['admin', 'hr'] },
    { name: t('nav.myPayslips', 'My Payslips'), href: '/payslips', icon: Receipt, roles: ['staff'] },
    { name: t('nav.announcements'), href: '/announcements', icon: Megaphone, roles: ['admin', 'hr'] },
    { name: t('nav.reports'), href: '/reports', icon: FileText, roles: ['admin', 'hr'] },
    { name: t('nav.userManagement'), href: '/users', icon: UserCog, roles: ['admin'] },
    { name: t('nav.settings'), href: '/settings', icon: Settings, roles: ['admin', 'hr', 'staff'] },
  ];

  // Only show Dashboard if user is deactivated
  const isDeactivated = user && user.is_active === false;
  const filteredNavigation = isDeactivated
    ? navigation.filter(item => item.href === '/dashboard')
    : navigation.filter(item => item.roles.includes(user?.role || 'staff'));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  if (isDeactivated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-10 flex flex-col items-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold text-red-600 mb-2">Your account is deactivated</h1>
            <p className="text-lg text-gray-700 mb-6 text-center">
              You no longer have access to the Employee Management System.<br />
              If you believe this is a mistake or need assistance, please contact your administrator or HR department.
            </p>
            <Button variant="primary" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-primary-900 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} ${isRTL ? 'lg:translate-x-0' : 'lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-primary-800">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Briefcase className="w-6 h-6 text-primary-900" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">
                  {t('auth.employeeManagementSystem')}
                </h1>
                <p className="text-primary-300 text-[10px] tracking-wide uppercase">
                  {user?.role === 'admin' && t('auth.adminPortal')}
                  {user?.role === 'hr' && t('auth.hrPortal')}
                  {user?.role === 'staff' && t('auth.staffPortal')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-primary-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-800 text-white'
                          : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-primary-800">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-2 mb-2 text-primary-100`}>
              <div className="w-8 h-8 bg-primary-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">
                  {user?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-primary-300 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-800 hover:text-white transition-colors`}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('auth.signOut')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`${isRTL ? 'lg:mr-64' : 'lg:ml-64'} transition-all duration-300`}>
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:block hidden" />

            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              {/* Points display for all users */}
              {totalPoints !== null && (
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1.5' : 'space-x-1.5'} px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-lg border border-amber-200`}>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{totalPoints}</span>
                  <span className="text-xs text-amber-600">{t('common.points', 'pts')}</span>
                </div>
              )}
              <button
                onClick={toggleLanguage}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors`}
                title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
              >
                <Globe className="w-4 h-4" />
                <span>{isRTL ? 'EN' : 'ع'}</span>
              </button>
              <NotificationCenter />
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
