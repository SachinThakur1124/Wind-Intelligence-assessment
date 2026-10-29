import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TimeseriesRecord } from '../../../types/api';
import { formatMW, formatDateTime } from '../../../lib/formatters';
import { Calendar, Eye } from 'lucide-react';

interface ForecastVsActualChartProps {
  records: TimeseriesRecord[];
  onSelectRecord?: (record: TimeseriesRecord) => void;
}

export const ForecastVsActualChart: React.FC<ForecastVsActualChartProps> = ({
  records,
  onSelectRecord,
}) => {
  // Date filter state: 'all', 'week1', 'week2', 'week3', 'week4', 'week5'
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('week1');
  const [selectedPoint, setSelectedPoint] = useState<TimeseriesRecord | null>(null);

  const filteredRecords = useMemo(() => {
    if (dateRangeFilter === 'all') return records;
    if (dateRangeFilter === 'week1') {
      return records.filter((r) => r.settlement_date >= '2026-01-02' && r.settlement_date <= '2026-01-08');
    }
    if (dateRangeFilter === 'week2') {
      return records.filter((r) => r.settlement_date >= '2026-01-09' && r.settlement_date <= '2026-01-15');
    }
    if (dateRangeFilter === 'week3') {
      return records.filter((r) => r.settlement_date >= '2026-01-16' && r.settlement_date <= '2026-01-22');
    }
    if (dateRangeFilter === 'week4') {
      return records.filter((r) => r.settlement_date >= '2026-01-23' && r.settlement_date <= '2026-01-29');
    }
    if (dateRangeFilter === 'week5') {
      return records.filter((r) => r.settlement_date >= '2026-01-30' && r.settlement_date <= '2026-02-01');
    }
    return records;
  }, [records, dateRangeFilter]);

  // Format tick on X-axis: e.g. "02 Jan 00:00"
  const formatXAxisTick = (tickStr: string) => {
    try {
      const d = new Date(tickStr);
      return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    } catch {
      return tickStr;
    }
  };

  const handlePointClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const rec = state.activePayload[0].payload as TimeseriesRecord;
      setSelectedPoint(rec);
      if (onSelectRecord) {
        onSelectRecord(rec);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header with Title and Range Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center">
            Day-Ahead Wind Forecast vs Actual Generation Outturn
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Half-hourly resolution across Great Britain national wind portfolio (MW)
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-x-auto">
          <Calendar className="w-3.5 h-3.5 mx-1.5 text-slate-400 hidden sm:inline" />
          {[
            { id: 'week1', label: 'Jan 2–8' },
            { id: 'week2', label: 'Jan 9–15' },
            { id: 'week3', label: 'Jan 16–22' },
            { id: 'week4', label: 'Jan 23–29' },
            { id: 'week5', label: 'Jan 30–Feb 1' },
            { id: 'all', label: 'Full Cohort (31d)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRangeFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                dateRangeFilter === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 sm:h-96 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredRecords}
            onClick={handlePointClick}
            margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
            <XAxis
              dataKey="delivery_start_time"
              tickFormatter={formatXAxisTick}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              dy={10}
              minTickGap={40}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              dx={-5}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Generation (MW)',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as TimeseriesRecord;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-xl text-xs space-y-1.5 z-50">
                    <div className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between gap-4">
                      <span>{formatDateTime(data.delivery_start_time)}</span>
                      <span className="text-blue-500 font-mono">SP {data.settlement_period}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Forecast (MW):</span>
                      <span className="text-right font-mono font-bold">{formatMW(data.forecast_generation_mw)}</span>

                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Actual (MW):</span>
                      <span className="text-right font-mono font-bold">{formatMW(data.actual_generation_mw)}</span>

                      <span className="text-slate-500 font-medium">Signed Error:</span>
                      <span className={`text-right font-mono font-bold ${
                        (data.signed_error_mw ?? 0) > 0 ? 'text-amber-500' : 'text-blue-500'
                      }`}>
                        {data.signed_error_mw !== null ? `${data.signed_error_mw > 0 ? '+' : ''}${data.signed_error_mw} MW` : '—'}
                      </span>

                      <span className="text-slate-500 font-medium">Lead Time:</span>
                      <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                        {data.lead_time_hours !== null ? `${data.lead_time_hours} hrs` : '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      Purchased on {data.purchase_decision_date} by {data.decision_cutoff_time.slice(11, 16)} UTC
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="forecast_generation_mw"
              name="Day-Ahead Forecast (MW)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="actual_generation_mw"
              name="Actual Generation Outturn (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Point Inspector Callout */}
      {selectedPoint && (
        <div className="mt-4 p-3.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">
                Inspected Delivery Interval: {formatDateTime(selectedPoint.delivery_start_time)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-2">
                (Settlement Period {selectedPoint.settlement_period})
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4 font-mono">
            <span>Forecast: <strong className="text-blue-600">{formatMW(selectedPoint.forecast_generation_mw)}</strong></span>
            <span>Actual: <strong className="text-emerald-600">{formatMW(selectedPoint.actual_generation_mw)}</strong></span>
            <span>Error: <strong className={selectedPoint.signed_error_mw && selectedPoint.signed_error_mw > 0 ? 'text-amber-600' : 'text-blue-600'}>
              {selectedPoint.signed_error_mw !== null ? `${selectedPoint.signed_error_mw > 0 ? '+' : ''}${selectedPoint.signed_error_mw} MW` : '—'}
            </strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
