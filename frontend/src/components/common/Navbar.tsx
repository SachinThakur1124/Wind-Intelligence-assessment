import React from 'react';
import { Wind, RefreshCw, Sun, Moon, Clock, Calendar, Database } from 'lucide-react';
import { formatDateTime } from '../../lib/formatters';

interface NavbarProps {
  decisionMonth: string;
  cutoffTime: string;
  onCutoffChange: (newCutoff: string) => void;
  lastRefreshed: string | null;
  onRefresh: () => void;
  isLoading: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  decisionMonth,
  cutoffTime,
  onCutoffChange,
  lastRefreshed,
  onRefresh,
  isLoading,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo and Titles */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Wind Intelligence
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  GB Wholesale
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                UK Wind Forecast & Day-Ahead Decision Analytics
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Decision Month Badge */}
            <div className="hidden md:flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
              Cohort: <span className="font-semibold text-slate-900 dark:text-white ml-1">{decisionMonth}</span>
            </div>

            {/* Cutoff Selector */}
            <div className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 hidden sm:inline" />
              <label htmlFor="cutoff-select" className="text-slate-500 dark:text-slate-400 hidden lg:inline font-medium">
                Cutoff:
              </label>
              <select
                id="cutoff-select"
                value={cutoffTime}
                onChange={(e) => onCutoffChange(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                title="Select Day-Ahead Decision Gate Closure Cutoff"
              >
                <option value="11:00" className="dark:bg-slate-900">11:00 UTC (Elexon Standard)</option>
                <option value="09:50" className="dark:bg-slate-900">09:50 UTC (GB Auction Gate)</option>
                <option value="12:00" className="dark:bg-slate-900">12:00 UTC (Noon Cutoff)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live data from Elexon"
              className="inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:mr-1.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 shadow-sm transition active:scale-95"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Sub-bar with Attribution and Refresh info */}
        <div className="flex items-center justify-between py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center space-x-2">
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Data source: <strong className="text-slate-700 dark:text-slate-300">Elexon BMRS</strong> (FUELHH actuals & WINDFOR forecasts)</span>
          </div>
          {lastRefreshed && (
            <div className="hidden sm:block">
              Last refreshed: {formatDateTime(lastRefreshed)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
