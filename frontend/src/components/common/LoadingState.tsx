import React from 'react';
import { Wind } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center animate-pulse">
          <Wind className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">
        Ingesting & Analyzing Elexon BMRS Datasets...
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
        Retrieving January 2026 national wind outturns (FUELHH) and reconstructing historical day-ahead forecast runs (WINDFOR).
      </p>
    </div>
  );
};
