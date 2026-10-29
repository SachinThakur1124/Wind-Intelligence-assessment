import React, { useState, useMemo } from 'react';
import { TimeseriesRecord } from '../../../types/api';
import { formatMW, formatDateTime } from '../../../lib/formatters';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, Table as TableIcon } from 'lucide-react';

interface TimeseriesTableProps {
  records: TimeseriesRecord[];
}

export const TimeseriesTable: React.FC<TimeseriesTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof TimeseriesRecord>('delivery_start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search filter
      const matchSearch =
        r.delivery_start_time.includes(searchTerm) ||
        r.settlement_date.includes(searchTerm) ||
        r.purchase_decision_date.includes(searchTerm) ||
        String(r.settlement_period) === searchTerm.trim();

      // Status filter
      let matchStatus = true;
      if (statusFilter === 'matched') matchStatus = r.status === 'matched';
      if (statusFilter === 'overforecast') matchStatus = (r.signed_error_mw ?? 0) > 0;
      if (statusFilter === 'underforecast') matchStatus = (r.signed_error_mw ?? 0) < 0;
      if (statusFilter === 'missing') matchStatus = r.status !== 'matched';

      return matchSearch && matchStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      return sortDirection === 'asc' ? 1 : -1;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: keyof TimeseriesRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const exportToCsv = () => {
    const headers = [
      'DeliveryStartTime',
      'SettlementDate',
      'SettlementPeriod',
      'PurchaseDecisionDate',
      'ForecastPublishTime',
      'ForecastMW',
      'ActualMW',
      'SignedErrorMW',
      'AbsoluteErrorMW',
      'LeadTimeHours',
      'Status',
    ];

    const rows = sortedRecords.map((r) => [
      r.delivery_start_time,
      r.settlement_date,
      r.settlement_period,
      r.purchase_decision_date,
      r.forecast_publish_time || '',
      r.forecast_generation_mw ?? '',
      r.actual_generation_mw ?? '',
      r.signed_error_mw ?? '',
      r.absolute_error_mw ?? '',
      r.lead_time_hours ?? '',
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wind_forecast_accuracy_jan2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-2">
          <TableIcon className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Half-Hourly Timeseries Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit granular delivery intervals and corresponding day-ahead forecast decisions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search date or period..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Intervals ({records.length})</option>
            <option value="overforecast">Overforecasting (+)</option>
            <option value="underforecast">Underforecasting (−)</option>
            <option value="missing">Data Gaps</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={exportToCsv}
            title="Download timeseries as CSV"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('delivery_start_time')}
              >
                <div className="flex items-center space-x-1">
                  <span>Delivery Interval (UTC)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('settlement_period')}
              >
                <div className="flex items-center space-x-1">
                  <span>SP</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th scope="col" className="px-3 py-2.5">Decision Date</th>
              <th scope="col" className="px-3 py-2.5">Forecast Published</th>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('forecast_generation_mw')}
              >
                <div className="flex items-center space-x-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('actual_generation_mw')}
              >
                <div className="flex items-center space-x-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('signed_error_mw')}
              >
                <div className="flex items-center space-x-1">
                  <span>Signed Error (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('absolute_error_mw')}
              >
                <div className="flex items-center space-x-1">
                  <span>Abs Error (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">Lead Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {paginatedRecords.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td className="px-3 py-2 font-sans font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(r.delivery_start_time)}
                </td>
                <td className="px-3 py-2 text-blue-600 dark:text-blue-400 font-bold">
                  {r.settlement_period}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-sans">
                  {r.purchase_decision_date}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDateTime(r.forecast_publish_time)}
                </td>
                <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">
                  {formatMW(r.forecast_generation_mw)}
                </td>
                <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMW(r.actual_generation_mw)}
                </td>
                <td className={`px-3 py-2 font-bold ${
                  (r.signed_error_mw ?? 0) > 0 ? 'text-amber-500' : (r.signed_error_mw ?? 0) < 0 ? 'text-blue-500' : 'text-slate-400'
                }`}>
                  {r.signed_error_mw !== null ? `${r.signed_error_mw > 0 ? '+' : ''}${r.signed_error_mw} MW` : '—'}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {formatMW(r.absolute_error_mw)}
                </td>
                <td className="px-3 py-2 text-right text-slate-500 font-sans">
                  {r.lead_time_hours !== null ? `${r.lead_time_hours}h` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} records
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
