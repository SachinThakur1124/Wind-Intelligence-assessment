import React from 'react';
import { DataQualityResponse } from '../../../types/api';
import { ShieldCheck, CheckCircle2, AlertTriangle, Info, ExternalLink } from 'lucide-react';

interface DataQualityPanelProps {
  dataQuality: DataQualityResponse | null;
  cutoffTime: string;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  dataQuality,
  cutoffTime,
}) => {
  if (!dataQuality) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Data Quality & Methodology Assurance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit coverage metrics, upstream integrity checks, and procurement limitations
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Forecast Coverage</div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {dataQuality.forecast_coverage_percent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {dataQuality.matched_count} / {dataQuality.total_expected_half_hours} intervals
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Actual Outturn Coverage</div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {dataQuality.actual_coverage_percent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            FUELHH wind records
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Decision Cutoff Rule</div>
          <div className="mt-1 text-base font-bold font-mono text-slate-700 dark:text-slate-200">
            D-1 at {cutoffTime} UTC
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Configurable market gate
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Duplicates Handled</div>
          <div className="mt-1 text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {dataQuality.duplicate_records_count}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Deterministic deduping applied
          </div>
        </div>
      </div>

      {/* Rules and Limitations Box */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Core Governance & Operational Rules:</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          {dataQuality.methodology_notes.map((note, index) => (
            <li key={index} className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        {/* Mandatory Wholesale Procurement Advisory */}
        <div className="mt-4 p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Procurement Scope Disclaimer:</strong> This dashboard evaluates the accuracy of available national wind forecasts at the day-ahead gate closure. While essential for estimating renewable volume risk, wind generation accuracy alone does not dictate total electricity procurement requirements. Procurement decisions must integrate total system demand forecasts, solar/thermal generation outturns, interconnector flows, wholesale price spreads, and utility contract positions.
          </div>
        </div>

        {/* Elexon Reference Links */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>Official Elexon Datasets:</span>
          <div className="flex items-center space-x-4">
            <a
              href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              FUELHH API Docs <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <a
              href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              WINDFOR API Docs <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
