import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  OverviewResponse,
  TimeseriesResponse,
  AccuracyResponse,
  DataQualityResponse,
} from '../types/api';

export function useDashboardData(initialDecisionMonth = '2026-01', initialCutoff = '11:00') {
  const [decisionMonth, setDecisionMonth] = useState<string>(initialDecisionMonth);
  const [cutoffTime, setCutoffTime] = useState<string>(initialCutoff);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [ovRes, tsRes, accRes, dqRes] = await Promise.all([
          api.getOverview(decisionMonth, cutoffTime, refresh),
          api.getTimeseries(decisionMonth, cutoffTime, refresh),
          api.getAccuracy(decisionMonth, cutoffTime, refresh),
          api.getDataQuality(decisionMonth, cutoffTime, refresh),
        ]);

        setOverview(ovRes);
        setTimeseries(tsRes);
        setAccuracy(accRes);
        setDataQuality(dqRes);
      } catch (err: any) {
        setError(err.message || 'Failed to communicate with Wind Intelligence API');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [decisionMonth, cutoffTime]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
  };

  return {
    decisionMonth,
    setDecisionMonth,
    cutoffTime,
    setCutoffTime,
    overview,
    timeseries,
    accuracy,
    dataQuality,
    isLoading,
    isRefreshing,
    error,
    refreshData: handleRefresh,
  };
}
