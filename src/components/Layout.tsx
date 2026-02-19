import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
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
} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.myProfile'), href: '/profile', icon: User, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.employees'), href: '/employees', icon: Users, roles: ['admin', 'hr'] },
    { name: t('nav.departments'), href: '/departments', icon: Building2, roles: ['admin', 'hr'] },
    { name: t('nav.leaveManagement'), href: '/leaves', icon: Calendar, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.attendance'), href: '/attendance', icon: Clock, roles: ['admin', 'hr', 'staff'] },
    { name: t('nav.payroll', 'Payroll'), href: '/payroll', icon: Calculator, roles: ['admin', 'hr'] },
    { name: t('nav.myPayslips', 'My Payslips'), href: '/payslips', icon: Receipt, roles: ['staff'] },
    { name: t('nav.announcements'), href: '/announcements', icon: Megaphone, roles: ['admin', 'hr'] },
    { name: t('nav.reports'), href: '/reports', icon: FileText, roles: ['admin', 'hr'] },
    { name: t('nav.userManagement'), href: '/users', icon: UserCog, roles: ['admin'] },
    { name: t('nav.settings'), href: '/settings', icon: Settings, roles: ['admin', 'hr', 'staff'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role || 'staff')
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-blue-900 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} ${isRTL ? 'lg:translate-x-0' : 'lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-blue-800">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Briefcase className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">
                  {t('auth.ems')} <span className="text-blue-300 font-normal">Group</span>
                </h1>
                <p className="text-blue-300 text-[10px] tracking-wide uppercase">
                  {user?.role === 'admin' && t('auth.adminPortal')}
                  {user?.role === 'hr' && t('auth.hrPortal')}
                  {user?.role === 'staff' && t('auth.staffPortal')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-blue-200"
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
                          ? 'bg-blue-800 text-white'
                          : 'text-blue-100 hover:bg-blue-800 hover:text-white'
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

          <div className="p-4 border-t border-blue-800">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-2 mb-2 text-blue-100`}>
              <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">
                  {user?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-blue-300 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 hover:text-white transition-colors`}
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

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
