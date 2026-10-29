import {
  OverviewResponse,
  TimeseriesResponse,
  AccuracyResponse,
  ForecastVersionsResponse,
  DataQualityResponse,
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function fetchJson<T>(endpoint: string, params: Record<string, string | boolean | number> = {}): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      query.append(key, String(val));
    }
  });

  const url = `${API_BASE_URL}${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody && errBody.detail) {
        errorMsg = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  getOverview: (decisionMonth = '2026-01', cutoffTime = '11:00', refresh = false) =>
    fetchJson<OverviewResponse>('/api/overview', { decision_month: decisionMonth, cutoff_time: cutoffTime, refresh }),

  getTimeseries: (decisionMonth = '2026-01', cutoffTime = '11:00', refresh = false) =>
    fetchJson<TimeseriesResponse>('/api/timeseries', { decision_month: decisionMonth, cutoff_time: cutoffTime, refresh }),

  getAccuracy: (decisionMonth = '2026-01', cutoffTime = '11:00', refresh = false) =>
    fetchJson<AccuracyResponse>('/api/accuracy', { decision_month: decisionMonth, cutoff_time: cutoffTime, refresh }),

  getForecastVersions: (deliveryDate: string, cutoffTime = '11:00') =>
    fetchJson<ForecastVersionsResponse>('/api/forecast-versions', { delivery_date: deliveryDate, cutoff_time: cutoffTime }),

  getDataQuality: (decisionMonth = '2026-01', cutoffTime = '11:00', refresh = false) =>
    fetchJson<DataQualityResponse>('/api/data-quality', { decision_month: decisionMonth, cutoff_time: cutoffTime, refresh }),
};
