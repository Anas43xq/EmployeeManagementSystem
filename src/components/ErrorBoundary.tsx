import { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  t?: (key: string) => string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg 
                className="w-16 h-16 mx-auto text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {this.props.t?.('errorBoundary.somethingWentWrong') || 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {this.props.t?.('errorBoundary.unexpectedError') || 'An unexpected error occurred. This might be due to a session issue.'}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {this.props.t?.('errorBoundary.tryAgain') || 'Try Again'}
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                {this.props.t?.('errorBoundary.reloadPage') || 'Reload Page'}
              </button>
              
              <button
                onClick={this.handleClearAndReload}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
              >
                {this.props.t?.('errorBoundary.clearSessionReload') || 'Clear Session & Reload'}
              </button>
            </div>
            
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  {this.props.t?.('errorBoundary.errorDetails') || 'Error Details'}
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}





function isStaleChunkError(error: Error): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('mime type') ||
    (error.name === 'TypeError' && msg.includes('dynamically imported'))
  );
}

const STALE_RELOAD_KEY = 'ems_stale_chunk_reload';

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);

    
    
    
    if (isStaleChunkError(error)) {
      const alreadyReloaded = sessionStorage.getItem(STALE_RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(STALE_RELOAD_KEY, '1');
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    
    sessionStorage.removeItem(STALE_RELOAD_KEY);
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">{this.props.t?.('errorBoundary.failedToLoadSection') || 'Failed to load this section'}</p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
              {this.props.t?.('errorBoundary.retry') || 'Retry'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


export function ErrorBoundaryWithTranslation({ children, fallback, onError }: Omit<Props, 't'>) {
  const { t } = useTranslation();
  return <ErrorBoundary t={t} onError={onError} fallback={fallback}>{children}</ErrorBoundary>;
}


export function RouteErrorBoundaryWithTranslation({ children, fallback, onError }: Omit<Props, 't'>) {
  const { t } = useTranslation();
  return <RouteErrorBoundary t={t} onError={onError} fallback={fallback}>{children}</RouteErrorBoundary>;
}

export default ErrorBoundaryWithTranslation;
