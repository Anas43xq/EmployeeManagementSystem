import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationContainer from './components/NotificationContainer';
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeView = lazy(() => import('./pages/EmployeeView'));
const EmployeeEdit = lazy(() => import('./pages/EmployeeEdit'));
const Profile = lazy(() => import('./pages/Profile'));
const Departments = lazy(() => import('./pages/Departments'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Warnings = lazy(() => import('./pages/Warnings'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Announcements = lazy(() => import('./pages/Announcements'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'));
const PayslipView = lazy(() => import('./pages/PayslipView'));

function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <NotificationContainer />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></RouteErrorBoundary>} />
                <Route path="profile" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Profile /></Suspense></RouteErrorBoundary>} />
                <Route path="employees" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Employees /></Suspense></RouteErrorBoundary>} />
                <Route path="employees/new" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmployeeEdit /></Suspense></RouteErrorBoundary>} />
                <Route path="employees/:id" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmployeeView /></Suspense></RouteErrorBoundary>} />
                <Route path="employees/:id/edit" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmployeeEdit /></Suspense></RouteErrorBoundary>} />
                <Route path="departments" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Departments /></Suspense></RouteErrorBoundary>} />
                <Route path="attendance" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Attendance /></Suspense></RouteErrorBoundary>} />
                <Route path="leaves" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Leaves /></Suspense></RouteErrorBoundary>} />
                <Route path="tasks" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Tasks /></Suspense></RouteErrorBoundary>} />
                <Route path="warnings" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Warnings /></Suspense></RouteErrorBoundary>} />
                <Route path="complaints" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Complaints /></Suspense></RouteErrorBoundary>} />
                <Route path="payroll" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><PayrollDashboard /></Suspense></RouteErrorBoundary>} />
                <Route path="payslips" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><PayslipView /></Suspense></RouteErrorBoundary>} />
                <Route path="announcements" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Announcements /></Suspense></RouteErrorBoundary>} />
                <Route path="reports" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Reports /></Suspense></RouteErrorBoundary>} />
                <Route path="users" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><UserManagement /></Suspense></RouteErrorBoundary>} />
                <Route path="settings" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><Settings /></Suspense></RouteErrorBoundary>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
