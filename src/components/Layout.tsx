import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import { MobileSidebar } from './layout/MobileSidebar';
import { MobileHeader } from './layout/MobileHeader';
import { getMyTotalPoints } from '../services/performance';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (user?.employeeId) {
      getMyTotalPoints(user.employeeId)
        .then(setTotalPoints)
        .catch(() => setTotalPoints(0));
    }
  }, [user?.employeeId]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="hidden lg:block">
        <Navbar onSignOut={handleSignOut} totalPoints={totalPoints} />
      </div>

      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
      />

      <div className="flex flex-col min-h-screen">
        <MobileHeader
          totalPoints={totalPoints}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden lg:pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
