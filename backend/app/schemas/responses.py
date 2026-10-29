from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "ok"})
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    timestamp: str
    upstream_url: str


class AccuracyMetrics(BaseModel):
    matched_observations: int
    mae_mw: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmse_mw: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    bias_mw: Optional[float] = Field(None, description="Mean Error in MW (positive means overforecasting)")
    wape_percent: Optional[float] = Field(None, description="Weighted Absolute Percentage Error (null when undefined)")
    forecast_mean_mw: Optional[float] = Field(None, description="Mean forecast generation in MW")
    actual_mean_mw: Optional[float] = Field(None, description="Mean actual generation in MW")
    forecast_coverage_percent: float = Field(..., description="Percentage of delivery periods with eligible forecast")


class TimeseriesRecord(BaseModel):
    delivery_start_time: str = Field(..., description="ISO UTC timestamp of interval start")
    settlement_date: str = Field(..., description="GB Settlement Date (YYYY-MM-DD)")
    settlement_period: int = Field(..., description="GB Settlement Period (1-48/50)")
    purchase_decision_date: str = Field(..., description="Day-ahead decision date (YYYY-MM-DD)")
    decision_cutoff_time: str = Field(..., description="ISO UTC cutoff timestamp")
    forecast_publish_time: Optional[str] = Field(None, description="ISO UTC timestamp of selected forecast publication")
    forecast_generation_mw: Optional[float] = Field(None, description="Forecast wind generation in MW")
    actual_generation_mw: Optional[float] = Field(None, description="Actual wind generation outturn in MW")
    signed_error_mw: Optional[float] = Field(None, description="Forecast - Actual in MW")
    absolute_error_mw: Optional[float] = Field(None, description="Absolute error in MW")
    lead_time_hours: Optional[float] = Field(None, description="Hours between publication and delivery")
    status: str = Field(..., description="'matched', 'missing_forecast', or 'missing_actual'")


class TimeseriesResponse(BaseModel):
    decision_month: str
    decision_cutoff_rule: str
    total_records: int
    matched_records: int
    records: List[TimeseriesRecord]


class GroupedAccuracy(BaseModel):
    group_key: str
    label: str
    metrics: AccuracyMetrics


class AccuracyResponse(BaseModel):
    decision_month: str
    decision_cutoff_rule: str
    overall: AccuracyMetrics
    by_decision_date: List[GroupedAccuracy]
    by_settlement_period: List[GroupedAccuracy]
    by_hour_of_day: List[GroupedAccuracy]


class OverviewResponse(BaseModel):
    decision_month: str
    decision_cutoff_rule: str
    delivery_start: str
    delivery_end: str
    total_expected_intervals: int
    matched_intervals: int
    forecast_coverage_percent: float
    actual_coverage_percent: float
    metrics: AccuracyMetrics
    last_refreshed: str
    data_source: str = "Elexon BMRS (FUELHH & WINDFOR)"


class ForecastVersionItem(BaseModel):
    publish_time: str
    delivery_start_time: str
    forecast_generation_mw: float
    is_eligible: bool
    is_selected: bool
    lead_time_hours: float
    decision_cutoff_time: str


class ForecastVersionsResponse(BaseModel):
    delivery_date: str
    decision_date: str
    decision_cutoff_time: str
    selected_version_publish_time: Optional[str]
    total_versions: int
    eligible_versions_count: int
    versions: List[ForecastVersionItem]


class DataQualityResponse(BaseModel):
    decision_month: str
    decision_cutoff_rule: str
    total_expected_half_hours: int
    actual_records_count: int
    forecast_records_count: int
    matched_count: int
    missing_forecast_count: int
    missing_actual_count: int
    duplicate_records_count: int
    invalid_values_count: int
    forecast_coverage_percent: float
    actual_coverage_percent: float
    methodology_notes: List[str]
