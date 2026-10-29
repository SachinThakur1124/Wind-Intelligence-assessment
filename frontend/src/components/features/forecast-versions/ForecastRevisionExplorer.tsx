import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { ForecastVersionsResponse } from '../../../types/api';
import { formatMW, formatDateTime } from '../../../lib/formatters';
import { History, CheckCircle, AlertCircle, Star, Filter, Calendar } from 'lucide-react';

interface ForecastRevisionExplorerProps {
  cutoffTime: string;
}

export const ForecastRevisionExplorer: React.FC<ForecastRevisionExplorerProps> = ({ cutoffTime }) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [data, setData] = useState<ForecastVersionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterEligibleOnly, setFilterEligibleOnly] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadVersions() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getForecastVersions(selectedDate, cutoffTime);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch forecast versions');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadVersions();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, cutoffTime]);

  const displayedVersions = data
    ? filterEligibleOnly
      ? data.versions.filter((v) => v.is_eligible)
      : data.versions
    : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Forecast Revision Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit all published versions of the wind forecast across time to inspect revisions
            </p>
          </div>
        </div>

        {/* Date Selector & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <label htmlFor="delivery-date-picker" className="text-slate-500 dark:text-slate-400">
              Delivery Date:
            </label>
            <input
              id="delivery-date-picker"
              type="date"
              min="2026-01-02"
              max="2026-02-01"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setFilterEligibleOnly(!filterEligibleOnly)}
            className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              filterEligibleOnly
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Filter className="w-3 h-3 mr-1" />
            {filterEligibleOnly ? 'Showing Eligible Only' : 'All Versions'}
          </button>
        </div>
      </div>

      {/* Decision Context Callout */}
      {data && (
        <div className="my-3 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200/60 dark:border-blue-900/40 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Target Delivery: <strong>{data.delivery_date}</strong> | Day-Ahead Purchase Decision Date:{' '}
              <strong>{data.decision_date}</strong> (Cutoff: {data.decision_cutoff_time.slice(11, 16)} UTC)
            </span>
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-[11px]">
            Found <strong>{data.total_versions}</strong> historical publication records (
            <strong className="text-emerald-600">{data.eligible_versions_count} eligible</strong> at cutoff).
          </div>
        </div>
      )}

      {/* Content State */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading historical forecast versions...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-rose-500 text-xs">
          Error loading versions: {error}
        </div>
      ) : displayedVersions.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No forecast versions available for this delivery date.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-3 py-2.5">Target Interval</th>
                <th scope="col" className="px-3 py-2.5">Publication Time</th>
                <th scope="col" className="px-3 py-2.5">Lead Time</th>
                <th scope="col" className="px-3 py-2.5">Forecast (MW)</th>
                <th scope="col" className="px-3 py-2.5">Eligibility at Cutoff</th>
                <th scope="col" className="px-3 py-2.5 text-right">Decision Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {displayedVersions.map((v, i) => (
                <tr
                  key={i}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                    v.is_selected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-sans">
                    {formatDateTime(v.delivery_start_time)}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {formatDateTime(v.publish_time)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {v.lead_time_hours} hrs
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">
                    {formatMW(v.forecast_generation_mw)}
                  </td>
                  <td className="px-3 py-2">
                    {v.is_eligible ? (
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-sans">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Eligible (Published prior to cutoff)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-500 text-[10px] font-sans">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Ineligible (Post-cutoff revision)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {v.is_selected ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans bg-blue-600 text-white shadow-sm">
                        <Star className="w-2.5 h-2.5 mr-1 fill-white" />
                        Selected at Cutoff
                      </span>
                    ) : v.is_eligible ? (
                      <span className="text-slate-400 text-[10px] font-sans">Superseded</span>
                    ) : (
                      <span className="text-slate-400 text-[10px] font-sans">Disqualified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Educational notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <strong>Important Market Rule:</strong> Day-ahead power procurement occurs strictly before auction gate closure. Intraday forecast revisions published after the cutoff time cannot be retroactively used for day-ahead procurement decisions, even if they reflect closer real-time weather conditions.
      </div>
    </div>
  );
};
