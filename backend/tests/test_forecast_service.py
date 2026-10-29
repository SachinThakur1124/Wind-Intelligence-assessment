import pytest
from datetime import date, datetime, timezone
from app.services.forecast_service import forecast_service, parse_utc, format_utc


def test_compute_decision_cutoff_default():
    """Verify default day-ahead cutoff is D-1 at 11:00 UTC."""
    delivery_date = date(2026, 1, 5)
    dec_date, cutoff_dt = forecast_service.compute_decision_cutoff(delivery_date, "11:00")
    assert dec_date == date(2026, 1, 4)
    assert cutoff_dt == datetime(2026, 1, 4, 11, 0, 0, tzinfo=timezone.utc)
    assert format_utc(cutoff_dt) == "2026-01-04T11:00:00Z"


def test_compute_decision_cutoff_configurable():
    """Verify configurable day-ahead cutoff (e.g. 09:50 for GB auction gate closure)."""
    delivery_date = date(2026, 1, 2)
    dec_date, cutoff_dt = forecast_service.compute_decision_cutoff(delivery_date, "09:50")
    assert dec_date == date(2026, 1, 1)
    assert cutoff_dt == datetime(2026, 1, 1, 9, 50, 0, tzinfo=timezone.utc)


def test_latest_eligible_forecast_selection_synthetic():
    """
    Verify selection rule:
    For target delivery interval 2026-01-02 14:00:00Z:
      Decision date: 2026-01-01
      Cutoff: 2026-01-01 11:00:00Z
    Candidate versions:
      Version A: Published 2026-01-01 05:00:00Z (Eligible, Forecast = 8,000 MW)
      Version B: Published 2026-01-01 10:30:00Z (Eligible, LATEST at cutoff, Forecast = 8,500 MW)
      Version C: Published 2026-01-01 14:00:00Z (Ineligible - published after cutoff, Forecast = 9,200 MW)
      Version D: Published 2026-01-02 12:00:00Z (Ineligible - intraday, Forecast = 9,500 MW)
    EXPECTATION:
      Selected forecast MUST be Version B (8,500 MW).
      Version C and D MUST be excluded even if closer to delivery time.
    """
    synthetic_actuals = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T15:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 29,
            "fuelType": "WIND",
            "generation": 9000,
        },
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T15:30:00Z",
            "startTime": "2026-01-02T14:30:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 30,
            "fuelType": "WIND",
            "generation": 9100,
        },
    ]

    synthetic_forecasts = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T05:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8000,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T10:30:00Z",  # Eligible, latest before 11:00
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8500,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T14:00:00Z",  # Ineligible: after cutoff
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 9200,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-02T12:00:00Z",  # Ineligible: intraday
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 9500,
        },
    ]

    delivery_date = date(2026, 1, 2)
    matched, stats = forecast_service.process_and_match(
        actuals_raw=synthetic_actuals,
        forecasts_raw=synthetic_forecasts,
        delivery_start_date=delivery_date,
        delivery_end_date=delivery_date,
        cutoff_time_str="11:00",
    )

    # Find the record for SP 29 (14:00)
    sp29 = next(r for r in matched if r["settlement_period"] == 29)
    assert sp29["forecast_generation_mw"] == 8500.0
    assert sp29["forecast_publish_time"] == "2026-01-01T10:30:00Z"
    assert sp29["actual_generation_mw"] == 9000.0
    assert sp29["signed_error_mw"] == -500.0  # Underforecast: 8500 - 9000
    assert sp29["absolute_error_mw"] == 500.0
    assert sp29["status"] == "matched"

    # Find the record for SP 30 (14:30) - should inherit hourly forecast 8500 MW
    sp30 = next(r for r in matched if r["settlement_period"] == 30)
    assert sp30["forecast_generation_mw"] == 8500.0
    assert sp30["actual_generation_mw"] == 9100.0
    assert sp30["signed_error_mw"] == -600.0


def test_exclusion_when_no_forecast_before_cutoff():
    """Verify that if all forecasts were published after cutoff, none are selected."""
    synthetic_actuals = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T15:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 29,
            "fuelType": "WIND",
            "generation": 9000,
        }
    ]
    synthetic_forecasts = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T15:00:00Z",  # After cutoff (11:00)
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 9200,
        }
    ]
    delivery_date = date(2026, 1, 2)
    matched, stats = forecast_service.process_and_match(
        actuals_raw=synthetic_actuals,
        forecasts_raw=synthetic_forecasts,
        delivery_start_date=delivery_date,
        delivery_end_date=delivery_date,
        cutoff_time_str="11:00",
    )
    sp29 = next(r for r in matched if r["settlement_period"] == 29)
    assert sp29["forecast_generation_mw"] is None
    assert sp29["status"] == "missing_forecast"


def test_duplicate_records_handling():
    """Verify duplicate forecasts and actuals are resolved deterministically."""
    synthetic_actuals = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T15:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 29,
            "fuelType": "WIND",
            "generation": 9000,
        },
        # Duplicate actual outturn revision
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T16:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 29,
            "fuelType": "WIND",
            "generation": 9050,
        },
    ]
    synthetic_forecasts = [
        # Duplicate identical forecast records
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T10:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8800,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T10:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8800,
        },
    ]
    delivery_date = date(2026, 1, 2)
    matched, stats = forecast_service.process_and_match(
        actuals_raw=synthetic_actuals,
        forecasts_raw=synthetic_forecasts,
        delivery_start_date=delivery_date,
        delivery_end_date=delivery_date,
    )
    assert stats["duplicate_actuals_removed"] == 1
    assert stats["duplicate_forecasts_removed"] == 1
    sp29 = next(r for r in matched if r["settlement_period"] == 29)
    # Latest actual was kept (9050 MW)
    assert sp29["actual_generation_mw"] == 9050.0
    assert sp29["forecast_generation_mw"] == 8800.0


def test_timezone_normalization():
    """Verify timezone conversions to UTC."""
    dt1 = parse_utc("2026-01-01T10:00:00Z")
    assert dt1.tzinfo == timezone.utc
    assert dt1.hour == 10

    # With +01:00 offset
    dt2 = parse_utc("2026-01-01T11:00:00+01:00")
    assert dt2.tzinfo == timezone.utc
    assert dt2.hour == 10  # 11:00+01:00 is 10:00 UTC
