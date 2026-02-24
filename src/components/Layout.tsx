import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import { getMyTotalPoints } from '../services/performanceQueries';
import {
  Briefcase, LogOut, Menu, X,
  LayoutDashboard, Users, Building2, Clock, Calendar,
  ListTodo, MessageSquare, Calculator, Receipt,
  Megaphone, FileText, UserCog, Settings, Activity,
  User, AlertCircle,
} from 'lucide-react';

/* ─── Sidebar category definitions ────────────────────────────────────────── */
interface SideNavItem { name: string; href: string; icon: React.ElementType }
interface SideCategory { label: string; adminOnly: boolean; items: SideNavItem[] }

function useSideCategories(): SideCategory[] {
  const { t } = useTranslation();
  return [
    {
      label: t('navCategory.overview', 'OVERVIEW'),
      adminOnly: false,
      items: [
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.myProfile'), href: '/profile', icon: User },
      ],
    },
    {
      label: t('navCategory.workforce', 'WORKFORCE'),
      adminOnly: false,
      items: [
        { name: t('nav.employees'), href: '/employees', icon: Users },
        { name: t('nav.departments'), href: '/departments', icon: Building2 },
        { name: t('nav.attendance'), href: '/attendance', icon: Clock },
      ],
    },
    {
      label: t('navCategory.operations', 'OPERATIONS'),
      adminOnly: false,
      items: [
        { name: t('nav.leaveManagement'), href: '/leaves', icon: Calendar },
        { name: t('nav.tasks'), href: '/tasks', icon: ListTodo },
        { name: t('nav.payroll', 'Payroll'), href: '/payroll', icon: Calculator },
        { name: t('nav.myPayslips', 'My Payslips'), href: '/payslips', icon: Receipt },
      ],
    },
    {
      label: t('navCategory.communication', 'COMMUNICATION'),
      adminOnly: false,
      items: [
        { name: t('nav.announcements'), href: '/announcements', icon: Megaphone },
        { name: t('nav.complaints'), href: '/complaints', icon: MessageSquare },
        { name: t('nav.warnings'), href: '/warnings', icon: AlertCircle },
        { name: t('nav.reports'), href: '/reports', icon: FileText },
      ],
    },
    {
      label: t('navCategory.system', 'SYSTEM'),
      adminOnly: true,
      items: [
        { name: t('nav.userManagement'), href: '/users', icon: UserCog },
        { name: t('nav.activityLogs', 'Activity Logs'), href: '/activity-logs', icon: Activity },
        { name: t('nav.settings'), href: '/settings', icon: Settings },
      ],
    },
  ];
}

/* ─── Per-role allowed hrefs ───────────────────────────────────────────────── */
const ALLOWED: Record<string, string[]> = {
  admin: ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports', '/users', '/activity-logs', '/settings'],
  hr:    ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports'],
  staff: ['/dashboard', '/profile', '/attendance', '/leaves', '/tasks', '/payslips', '/complaints', '/warnings'],
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const categories = useSideCategories();

  useEffect(() => {
    if (user?.employeeId) {
      getMyTotalPoints(user.employeeId)
        .then(setTotalPoints)
        .catch(() => setTotalPoints(0));
    }
  }, [user?.employeeId]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const role = user?.role || 'staff';
  const allowed = ALLOWED[role] ?? [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ─── TOP NAVBAR — desktop/tablet ≥ 1024px only ────────────────────── */}
      <div className="hidden lg:block">
        <Navbar onSignOut={handleSignOut} totalPoints={totalPoints} />
      </div>

      {/* ─── SIDEBAR — mobile/tablet portrait < 1024px ─────────────────────  */}
      {/* Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-72 bg-primary-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-primary-800">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Briefcase className="w-5 h-5 text-primary-900" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base tracking-tight">{t('auth.employeeManagementSystem')}</h1>
                <p className="text-primary-300 text-[10px] tracking-wide uppercase">
                  {role === 'admin' && t('auth.adminPortal')}
                  {role === 'hr' && t('auth.hrPortal')}
                  {role === 'staff' && t('auth.staffPortal')}
                </p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-primary-200 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer nav — categorized */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {categories.map(cat => {
              if (cat.adminOnly && role !== 'admin') return null;
              const items = cat.items.filter(i => allowed.includes(i.href));
              if (items.length === 0) return null;
              return (
                <div key={cat.label}>
                  <p className="px-3 mb-1.5 text-[10px] font-semibold text-primary-400 uppercase tracking-widest select-none">
                    {cat.label}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map(item => {
                      const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                      return (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                              isRTL ? 'flex-row-reverse' : ''
                            } ${
                              isActive
                                ? 'bg-primary-800 text-white'
                                : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                            }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {/* Settings for hr/staff — separate ACCOUNT section */}
            {role !== 'admin' && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-primary-400 uppercase tracking-widest select-none">
                  {t('navCategory.account', 'ACCOUNT')}
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      to="/settings"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isRTL ? 'flex-row-reverse' : ''
                      } ${
                        location.pathname === '/settings'
                          ? 'bg-primary-800 text-white'
                          : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                      }`}
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      {t('nav.settings')}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </nav>

          {/* Drawer footer */}
          <div className="p-4 border-t border-primary-800">
            <div className={`flex items-center gap-3 px-3 py-2 mb-1 text-primary-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 bg-primary-800 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-bold">{user?.email.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-primary-300 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 hover:text-white transition-colors text-sm font-medium ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT WRAPPER ──────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen">
        {/* Mobile top bar — hamburger + logo, visible only < 1024px */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className={`flex items-center justify-between px-4 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Briefcase className="w-5 h-5 text-primary-900" />
              <span className="font-bold text-primary-900 text-sm">{t('auth.employeeManagementSystem')}</span>
            </div>
            {/* spacer to center the logo */}
            <div className="w-9" />
          </div>
        </header>

        {/* Page content — padding-top on desktop accounts for fixed navbar height */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden lg:pt-[calc(var(--navbar-height,56px)+24px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
