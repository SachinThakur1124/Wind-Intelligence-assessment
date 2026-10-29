import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TimeseriesRecord, GroupedAccuracy } from '../../../types/api';
import { formatMW, formatDateTime } from '../../../lib/formatters';
import { HelpCircle, Clock } from 'lucide-react';

interface ErrorAnalysisChartProps {
  records: TimeseriesRecord[];
  hourlyBreakdown: GroupedAccuracy[];
  wapePercent: number | null;
}

export const ErrorAnalysisChart: React.FC<ErrorAnalysisChartProps> = ({
  records,
  hourlyBreakdown,
  wapePercent,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'diurnal'>('timeline');

  // Sample or slice records for readable timeline visualization
  const timelineData = records.slice(0, 192); // first 4 days for crisp interval inspection, or downsample

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Forecast Error Analysis & Uncertainty
            </h2>
            {wapePercent !== null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                WAPE: {wapePercent}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Signed forecast discrepancy (Forecast − Actual) and diurnal profile (MW)
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Signed Error Timeline
          </button>
          <button
            onClick={() => setViewMode('diurnal')}
            className={`px-3 py-1 rounded-md font-medium transition flex items-center ${
              viewMode === 'diurnal'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Diurnal Profile (24h)
          </button>
        </div>
      </div>

      {/* Explanatory Sign Convention Banner */}
      <div className="my-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            <strong>Sign Convention:</strong> Error = <span className="font-mono">Forecast − Actual</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">
              <strong>Positive Error (+):</strong> Overforecasting (excess generation assumed)
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-400">
              <strong>Negative Error (−):</strong> Underforecasting (shortfall assumed)
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      {viewMode === 'timeline' ? (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="delivery_start_time"
                tickFormatter={(val) => {
                  try {
                    const d = new Date(val);
                    return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                  } catch {
                    return val;
                  }
                }}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                minTickGap={35}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'Signed Error (MW)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as TimeseriesRecord;
                  const err = data.signed_error_mw;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatDateTime(data.delivery_start_time)} (SP {data.settlement_period})
                      </div>
                      <div className="font-mono">
                        Signed Error:{' '}
                        <strong className={err !== null && err > 0 ? 'text-amber-500' : 'text-blue-500'}>
                          {err !== null ? `${err > 0 ? '+' : ''}${err} MW` : '—'}
                        </strong>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Forecast: {formatMW(data.forecast_generation_mw)} | Actual: {formatMW(data.actual_generation_mw)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="signed_error_mw" name="Signed Error (MW)">
                {timelineData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={(entry.signed_error_mw ?? 0) >= 0 ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourlyBreakdown.map((item) => ({
                hour: item.label,
                mae: item.metrics.mae_mw,
                bias: item.metrics.bias_mw,
              }))}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => val.split(' ')[0]}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'Error (MW)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white">{data.hour}</div>
                      <div>MAE: <strong className="font-mono text-amber-500">{formatMW(data.mae)}</strong></div>
                      <div>Bias: <strong className="font-mono text-blue-500">{formatMW(data.bias)}</strong></div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="mae" name="MAE (MW)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="bias" name="Bias (MW)" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
