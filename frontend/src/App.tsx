import { useState, useEffect } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { Navbar } from './components/common/Navbar';
import { LoadingState } from './components/common/LoadingState';
import { ErrorState } from './components/common/ErrorState';
import { KpiGrid } from './components/features/overview/KpiGrid';
import { ForecastVsActualChart } from './components/features/forecast-analysis/ForecastVsActualChart';
import { ErrorAnalysisChart } from './components/features/forecast-analysis/ErrorAnalysisChart';
import { ForecastRevisionExplorer } from './components/features/forecast-versions/ForecastRevisionExplorer';
import { TimeseriesTable } from './components/features/timeseries-table/TimeseriesTable';
import { DataQualityPanel } from './components/features/data-quality/DataQualityPanel';
import { Wind } from 'lucide-react';

export function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const {
    decisionMonth,
    cutoffTime,
    setCutoffTime,
    overview,
    timeseries,
    accuracy,
    dataQuality,
    isLoading,
    isRefreshing,
    error,
    refreshData,
  } = useDashboardData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Section A: Header Navbar */}
      <Navbar
        decisionMonth={decisionMonth}
        cutoffTime={cutoffTime}
        onCutoffChange={setCutoffTime}
        lastRefreshed={overview?.last_refreshed || null}
        onRefresh={refreshData}
        isLoading={isRefreshing || isLoading}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLoading && !overview ? (
          <LoadingState />
        ) : error && !overview ? (
          <ErrorState message={error} onRetry={refreshData} />
        ) : (
          <>
            {/* Context Sub-header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 max-w-3xl">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-2">
                  GB Wholesale Day-Ahead Decision Cohort
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  January 2026 Procurement Horizon
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-blue-100/80 leading-relaxed">
                  Evaluating wind generation available for delivery across <strong>1,488 half-hourly settlement periods</strong> (02 Jan – 01 Feb 2026).
                  All evaluated forecasts reflect only publications available prior to the <strong>D-1 at {cutoffTime} UTC</strong> market gate closure.
                </p>
              </div>
            </div>

            {/* Section B: KPI Cards Grid */}
            <KpiGrid
              metrics={overview?.metrics || null}
              totalIntervals={overview?.total_expected_intervals || 1488}
            />

            {/* Section C: Forecast vs Actual Time-series Chart */}
            {timeseries && (
              <ForecastVsActualChart records={timeseries.records} />
            )}

            {/* Section D: Forecast Error Analysis & Diurnal Profile */}
            {timeseries && accuracy && (
              <ErrorAnalysisChart
                records={timeseries.records}
                hourlyBreakdown={accuracy.by_hour_of_day}
                wapePercent={accuracy.overall.wape_percent}
              />
            )}

            {/* Section E: Forecast Revision Explorer */}
            <ForecastRevisionExplorer cutoffTime={cutoffTime} />

            {/* Section F: Half-Hourly Timeseries Ledger */}
            {timeseries && (
              <TimeseriesTable records={timeseries.records} />
            )}

            {/* Section G: Data Quality Assurance & Limitations */}
            <DataQualityPanel
              dataQuality={dataQuality}
              cutoffTime={cutoffTime}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Wind className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Wind Intelligence</span>
            <span>— UK Wind Forecast Accuracy Product</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>FastAPI Backend + React Vite Dashboard</span>
            <span>•</span>
            <span>Datasets: Elexon BMRS FUELHH & WINDFOR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
