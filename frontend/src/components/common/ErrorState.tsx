import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        Unable to Load Analytics Data
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {message}
      </p>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Note: If connecting to a free-tier cloud backend (e.g. Render), services spin down during inactivity and take ~45 seconds to wake up.
      </p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Retry Request
      </button>
    </div>
  );
};
