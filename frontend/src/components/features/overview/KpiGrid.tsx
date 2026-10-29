import React from 'react';
import { Wind, Zap, Target, Activity, Compass, Percent } from 'lucide-react';
import { AccuracyMetrics } from '../../../types/api';
import { KpiCard } from '../../common/KpiCard';
import { formatMW, formatPercent } from '../../../lib/formatters';

interface KpiGridProps {
  metrics: AccuracyMetrics | null;
  totalIntervals: number;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, totalIntervals }) => {
  if (!metrics) return null;

  const biasVal = metrics.bias_mw ?? 0;
  const isOverforecast = biasVal > 0;
  const biasBadgeText = isOverforecast ? 'Overforecasting' : biasVal < 0 ? 'Underforecasting' : 'Neutral';
  const biasBadgeVariant = isOverforecast ? 'positive' : biasVal < 0 ? 'negative' : 'neutral';

  return (
    <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Forecast Mean */}
      <KpiCard
        title="Forecast Average"
        value={formatMW(metrics.forecast_mean_mw, 0)}
        subtitle="Day-ahead expected generation"
        icon={Wind}
        tooltip="Mean wind generation forecast across all evaluated delivery intervals available at the day-ahead cutoff."
        iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />

      {/* 2. Actual Mean */}
      <KpiCard
        title="Actual Average"
        value={formatMW(metrics.actual_mean_mw, 0)}
        subtitle="GB outturn wind delivery"
        icon={Zap}
        tooltip="Mean metered national wind generation outturn (FUELHH) across corresponding delivery intervals."
        iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />

      {/* 3. MAE */}
      <KpiCard
        title="MAE"
        value={formatMW(metrics.mae_mw, 0)}
        subtitle="Mean Absolute Error"
        icon={Target}
        tooltip="Mean magnitude of forecast error (|Forecast - Actual|). Measures expected volume discrepancy."
        badge={{ text: 'Discrepancy', variant: 'neutral' }}
        iconBgColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />

      {/* 4. RMSE */}
      <KpiCard
        title="RMSE"
        value={formatMW(metrics.rmse_mw, 0)}
        subtitle="Penalizes large errors"
        icon={Activity}
        tooltip="Root Mean Squared Error. Gives higher weight to severe forecast misses that drive balancing spikes."
        badge={{ text: 'Volatility', variant: 'neutral' }}
        iconBgColor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
      />

      {/* 5. Forecast Bias */}
      <KpiCard
        title="Forecast Bias"
        value={formatMW(metrics.bias_mw, 0)}
        subtitle="Mean Error (F - A)"
        icon={Compass}
        tooltip="Positive bias means systematic overforecasting (utility bought too much wind day-ahead). Negative means underforecasting."
        badge={{
          text: biasBadgeText,
          variant: biasBadgeVariant,
        }}
        iconBgColor={isOverforecast ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}
      />

      {/* 6. WAPE / Coverage */}
      <KpiCard
        title="WAPE & Coverage"
        value={formatPercent(metrics.wape_percent, 1)}
        subtitle={`${metrics.matched_observations} / ${totalIntervals} intervals`}
        icon={Percent}
        tooltip="Weighted Absolute Percentage Error: sum(|Error|) / sum(Actual). Valid only when actual generation > 0."
        badge={{
          text: `${metrics.forecast_coverage_percent.toFixed(0)}% Coverage`,
          variant: metrics.forecast_coverage_percent > 95 ? 'positive' : 'info',
        }}
        iconBgColor="bg-teal-500/10 text-teal-600 dark:text-teal-400"
      />
    </section>
  );
};
