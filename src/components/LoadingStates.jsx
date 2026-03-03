// src/components/LoadingStates.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <Loader2 className={`${sizes[size]} animate-spin text-blue-600 ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  );
}

export function TicketSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40">
      <div className="flex items-center gap-4">
        <LoadingSkeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
