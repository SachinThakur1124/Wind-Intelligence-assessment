export interface AccuracyMetrics {
  matched_observations: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_percent: number | null;
  forecast_mean_mw: number | null;
  actual_mean_mw: number | null;
  forecast_coverage_percent: number;
}

export interface TimeseriesRecord {
  delivery_start_time: string;
  settlement_date: string;
  settlement_period: number;
  purchase_decision_date: string;
  decision_cutoff_time: string;
  forecast_publish_time: string | null;
  forecast_generation_mw: number | null;
  actual_generation_mw: number | null;
  signed_error_mw: number | null;
  absolute_error_mw: number | null;
  percentage_error: number | null;
  lead_time_hours: number | null;
  status: 'matched' | 'missing_forecast' | 'missing_actual' | 'missing_both';
}

export interface TimeseriesResponse {
  decision_month: string;
  decision_cutoff_rule: string;
  total_records: number;
  matched_records: number;
  records: TimeseriesRecord[];
}

export interface GroupedAccuracy {
  group_key: string;
  label: string;
  metrics: AccuracyMetrics;
}

export interface AccuracyResponse {
  decision_month: string;
  decision_cutoff_rule: string;
  overall: AccuracyMetrics;
  by_decision_date: GroupedAccuracy[];
  by_settlement_period: GroupedAccuracy[];
  by_hour_of_day: GroupedAccuracy[];
}

export interface OverviewResponse {
  decision_month: string;
  decision_cutoff_rule: string;
  delivery_start: string;
  delivery_end: string;
  total_expected_intervals: number;
  matched_intervals: number;
  forecast_coverage_percent: number;
  actual_coverage_percent: number;
  metrics: AccuracyMetrics;
  last_refreshed: string;
  data_source: string;
}

export interface ForecastVersionItem {
  publish_time: string;
  delivery_start_time: string;
  forecast_generation_mw: number;
  is_eligible: boolean;
  is_selected: boolean;
  lead_time_hours: number;
  decision_cutoff_time: string;
}

export interface ForecastVersionsResponse {
  delivery_date: string;
  decision_date: string;
  decision_cutoff_time: string;
  selected_version_publish_time: string | null;
  total_versions: number;
  eligible_versions_count: number;
  versions: ForecastVersionItem[];
}

export interface DataQualityResponse {
  decision_month: string;
  decision_cutoff_rule: string;
  total_expected_half_hours: number;
  actual_records_count: number;
  forecast_records_count: number;
  matched_count: number;
  missing_forecast_count: number;
  missing_actual_count: number;
  duplicate_records_count: number;
  invalid_values_count: number;
  forecast_coverage_percent: number;
  actual_coverage_percent: number;
  methodology_notes: string[];
}
