import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const LOADING_TIMEOUT_MS = 8000; // Show reset button after 8 seconds

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading, resetSession } = useAuth();
  const [showResetOption, setShowResetOption] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (loading) {
      timeout = setTimeout(() => {
        setShowResetOption(true);
      }, LOADING_TIMEOUT_MS);
    } else {
      setShowResetOption(false);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSession();
    } catch (_) {
      // silently fail
    } finally {
      setIsResetting(false);
    }
  };

  // Redirect to login only if NOT loading (session check finished and no user)
  if (!user && !loading) {
    return <Navigate to="/login" replace />;
  }

  // Show loading spinner ONLY if user is authenticated but their data is still loading
  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto mb-4"></div>
          {showResetOption && (
            <div className="mt-4">
              <p className="text-gray-600 text-sm mb-2">Taking longer than expected?</p>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
              >
                {isResetting ? 'Resetting...' : 'Reset Session'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user && user.isActive === false) {
    return <Navigate to="/deactivated" replace />;
  }

  if (user && roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children (allows Navigate to work during session check, shows page after auth)
  return <>{children}</>;
}

