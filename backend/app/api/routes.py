import logging
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.core.cache import cache
from app.schemas.responses import (
    HealthResponse,
    OverviewResponse,
    TimeseriesResponse,
    AccuracyResponse,
    ForecastVersionsResponse,
    DataQualityResponse,
    TimeseriesRecord,
)
from app.services.elexon_client import elexon_client
from app.services.forecast_service import forecast_service
from app.services.metrics_service import metrics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["wind-intelligence"])


async def get_or_compute_cohort_data(
    decision_month: str, cutoff_time: str, force_refresh: bool = False
):
    """
    Cached retrieval and computation of normalized timeseries, metrics,
    and data quality statistics for the requested decision month.
    """
    cache_key = f"cohort:{decision_month}:{cutoff_time}"
    if not force_refresh:
        cached_data = await cache.get(cache_key)
        if cached_data:
            logger.info(f"Returning cached cohort data for {cache_key}")
            return cached_data

    # Fetch raw datasets
    try:
        actuals_raw, forecasts_raw, del_start, del_end = (
            await forecast_service.get_raw_datasets_for_cohort(decision_month)
        )
    except Exception as exc:
        logger.error(f"Failed to fetch upstream Elexon data: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Error connecting to Elexon BMRS API: {str(exc)}",
        )

    # Process and match
    matched_records, data_quality_stats = forecast_service.process_and_match(
        actuals_raw=actuals_raw,
        forecasts_raw=forecasts_raw,
        delivery_start_date=del_start,
        delivery_end_date=del_end,
        cutoff_time_str=cutoff_time,
    )

    # Calculate metrics
    metrics = metrics_service.calculate_metrics(
        matched_records, total_expected=len(matched_records)
    )
    by_date = metrics_service.calculate_grouped_by_date(matched_records)
    by_sp = metrics_service.calculate_grouped_by_settlement_period(matched_records)
    by_hr = metrics_service.calculate_grouped_by_hour(matched_records)

    payload = {
        "decision_month": decision_month,
        "cutoff_time": cutoff_time,
        "delivery_start": del_start.strftime("%Y-%m-%d"),
        "delivery_end": del_end.strftime("%Y-%m-%d"),
        "matched_records": matched_records,
        "metrics": metrics,
        "by_date": by_date,
        "by_sp": by_sp,
        "by_hr": by_hr,
        "data_quality_stats": data_quality_stats,
        "last_refreshed": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raw_forecasts": forecasts_raw,
    }

    # Cache with TTL
    await cache.set(cache_key, payload, ttl=settings.CACHE_TTL_SECONDS)
    return payload


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns service health, version, and upstream status."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        upstream_url=settings.ELEXON_BASE_URL,
    )


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    decision_month: str = Query("2026-01", pattern=r"^\d{4}-\d{2}$"),
    cutoff_time: str = Query("11:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    refresh: bool = Query(False),
):
    """
    Returns high-level summary KPIs, delivery period range,
    forecast/actual coverage, and aggregate accuracy metrics.
    """
    data = await get_or_compute_cohort_data(decision_month, cutoff_time, refresh)
    records = data["matched_records"]
    total = len(records)
    matched = sum(1 for r in records if r["status"] == "matched")

    f_cov = round((matched / total * 100.0), 2) if total > 0 else 0.0
    act_count = sum(1 for r in records if r.get("actual_generation_mw") is not None)
    a_cov = round((act_count / total * 100.0), 2) if total > 0 else 0.0

    return OverviewResponse(
        decision_month=decision_month,
        decision_cutoff_rule=f"D-1 at {cutoff_time} UTC",
        delivery_start=data["delivery_start"],
        delivery_end=data["delivery_end"],
        total_expected_intervals=total,
        matched_intervals=matched,
        forecast_coverage_percent=f_cov,
        actual_coverage_percent=a_cov,
        metrics=data["metrics"],
        last_refreshed=data["last_refreshed"],
    )


@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(
    decision_month: str = Query("2026-01", pattern=r"^\d{4}-\d{2}$"),
    cutoff_time: str = Query("11:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    refresh: bool = Query(False),
):
    """
    Returns half-hourly timeseries records containing delivery timestamp,
    selected forecast generation, actual generation, signed error, and absolute error.
    """
    data = await get_or_compute_cohort_data(decision_month, cutoff_time, refresh)
    records = [TimeseriesRecord(**r) for r in data["matched_records"]]
    matched_count = sum(1 for r in records if r.status == "matched")

    return TimeseriesResponse(
        decision_month=decision_month,
        decision_cutoff_rule=f"D-1 at {cutoff_time} UTC",
        total_records=len(records),
        matched_records=matched_count,
        records=records,
    )


@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    decision_month: str = Query("2026-01", pattern=r"^\d{4}-\d{2}$"),
    cutoff_time: str = Query("11:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    refresh: bool = Query(False),
):
    """
    Returns statistical metrics: MAE, RMSE, Bias, and WAPE,
    along with breakdowns by decision date, settlement period, and hour of day.
    """
    data = await get_or_compute_cohort_data(decision_month, cutoff_time, refresh)

    return AccuracyResponse(
        decision_month=decision_month,
        decision_cutoff_rule=f"D-1 at {cutoff_time} UTC",
        overall=data["metrics"],
        by_decision_date=data["by_date"],
        by_settlement_period=data["by_sp"],
        by_hour_of_day=data["by_hr"],
    )


@router.get("/forecast-versions", response_model=ForecastVersionsResponse)
async def get_forecast_versions(
    delivery_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_time: str = Query("11:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
):
    """
    Returns all historical forecast versions for inspecting how a forecast evolved
    across successive publications, clearly indicating which version met the cutoff.
    """
    # Fetch WINDFOR for window around delivery date
    try:
        t_date = datetime.strptime(delivery_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # WINDFOR forecasts published 4 days prior to delivery date up to delivery date
    wf_start = datetime.combine(t_date - timedelta(days=4), datetime.min.time(), tzinfo=timezone.utc)
    wf_end = datetime.combine(t_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)

    cache_key = f"versions:{delivery_date}:{cutoff_time}"
    cached = await cache.get(cache_key)
    if cached:
        return ForecastVersionsResponse(**cached)

    try:
        raw_forecasts = await elexon_client.fetch_windfor_forecasts(wf_start, wf_end)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch forecast versions: {exc}")

    result = forecast_service.get_forecast_versions_for_date(
        delivery_date_str=delivery_date,
        forecasts_raw=raw_forecasts,
        cutoff_time_str=cutoff_time,
    )

    await cache.set(cache_key, result, ttl=settings.CACHE_TTL_SECONDS)
    return ForecastVersionsResponse(**result)


@router.get("/data-quality", response_model=DataQualityResponse)
async def get_data_quality(
    decision_month: str = Query("2026-01", pattern=r"^\d{4}-\d{2}$"),
    cutoff_time: str = Query("11:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    refresh: bool = Query(False),
):
    """
    Returns data quality audit metrics: missing intervals, missing actuals,
    missing forecasts, duplicates removed, and coverage percentages.
    """
    data = await get_or_compute_cohort_data(decision_month, cutoff_time, refresh)
    stats = data["data_quality_stats"]
    records = data["matched_records"]
    total = len(records)
    matched = sum(1 for r in records if r["status"] == "matched")

    f_cov = round((matched / total * 100.0), 2) if total > 0 else 0.0
    act_count = sum(1 for r in records if r.get("actual_generation_mw") is not None)
    a_cov = round((act_count / total * 100.0), 2) if total > 0 else 0.0

    notes = [
        "Analytical data sourced exclusively from Elexon BMRS FUELHH (actual outturn) and WINDFOR (forecast) streams.",
        f"Day-ahead decision cutoff defined at D-1 {cutoff_time} UTC.",
        "Positive bias denotes systematic overforecasting (forecast > actual).",
        "WINDFOR hourly forecast generation rates are mapped across both half-hourly settlement periods of each forecast clock hour.",
        "Wind forecast accuracy supports wholesale procurement evaluation but does not determine total power demand or trading positions.",
    ]

    return DataQualityResponse(
        decision_month=decision_month,
        decision_cutoff_rule=f"D-1 at {cutoff_time} UTC",
        total_expected_half_hours=total,
        actual_records_count=stats["total_actuals_raw"],
        forecast_records_count=stats["total_forecasts_raw"],
        matched_count=matched,
        missing_forecast_count=stats["missing_forecasts_count"],
        missing_actual_count=stats["missing_actuals_count"],
        duplicate_records_count=stats["duplicate_forecasts_removed"] + stats["duplicate_actuals_removed"],
        invalid_values_count=stats["invalid_actuals_count"] + stats["invalid_forecasts_count"],
        forecast_coverage_percent=f_cov,
        actual_coverage_percent=a_cov,
        methodology_notes=notes,
    )
