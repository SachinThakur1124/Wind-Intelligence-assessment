import React from 'react';
import { LucideIcon, Info } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'info';
  };
  tooltip?: string;
  iconBgColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  tooltip,
  iconBgColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}) => {
  const getBadgeStyle = () => {
    if (!badge) return '';
    switch (badge.variant) {
      case 'positive':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'negative':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'neutral':
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
            {title}
            {tooltip && (
              <span className="relative ml-1 cursor-pointer group/tip inline-flex">
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:block w-48 p-2 bg-slate-900 text-white text-[11px] font-normal normal-case rounded-md shadow-lg z-20 text-center leading-tight">
                  {tooltip}
                </span>
              </span>
            )}
          </span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBgColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {value}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {subtitle && (
          <span className="text-slate-500 dark:text-slate-400 truncate mr-2">
            {subtitle}
          </span>
        )}
        {badge && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeStyle()}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
