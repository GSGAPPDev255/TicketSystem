// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
    
    // Log to your error tracking service here if needed
    // Example: Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-rose-500" size={32} />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Oops! Something went wrong
              </h2>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              We've encountered an unexpected error. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details className="mb-6 text-sm">
                <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
