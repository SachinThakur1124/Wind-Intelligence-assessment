import math
import pytest
from app.services.metrics_service import metrics_service


def test_metrics_empty_records():
    """Verify metrics calculation handles empty records safely."""
    res = metrics_service.calculate_metrics([])
    assert res.matched_observations == 0
    assert res.mae_mw is None
    assert res.rmse_mw is None
    assert res.bias_mw is None
    assert res.wape_percent is None
    assert res.forecast_coverage_percent == 0.0


def test_metrics_standard_calculations():
    """
    Verify MAE, RMSE, Bias, and WAPE against hand-calculated synthetic fixtures.
    Synthetic test data:
      Point 1: Forecast = 1200, Actual = 1000 -> Error = +200, Abs = 200
      Point 2: Forecast = 800,  Actual = 1000 -> Error = -200, Abs = 200
      Point 3: Forecast = 1500, Actual = 1200 -> Error = +300, Abs = 300
    MAE = (200 + 200 + 300) / 3 = 700 / 3 = 233.33
    RMSE = sqrt((200^2 + (-200)^2 + 300^2) / 3) = sqrt((40000 + 40000 + 90000) / 3) = sqrt(170000 / 3) = sqrt(56666.67) = 238.05
    Bias = (200 - 200 + 300) / 3 = 300 / 3 = +100.0 (Positive => Overforecasting)
    WAPE = (200 + 200 + 300) / (1000 + 1000 + 1200) * 100 = 700 / 3200 * 100 = 21.88%
    """
    synthetic_records = [
        {"forecast_generation_mw": 1200.0, "actual_generation_mw": 1000.0},
        {"forecast_generation_mw": 800.0,  "actual_generation_mw": 1000.0},
        {"forecast_generation_mw": 1500.0, "actual_generation_mw": 1200.0},
    ]

    res = metrics_service.calculate_metrics(synthetic_records)
    assert res.matched_observations == 3
    assert res.mae_mw == 233.33
    assert res.rmse_mw == 238.05
    assert res.bias_mw == 100.0
    assert res.wape_percent == 21.88
    assert res.forecast_mean_mw == 1166.67
    assert res.actual_mean_mw == 1066.67
    assert res.forecast_coverage_percent == 100.0


def test_metrics_negative_bias_underforecasting():
    """Verify negative bias denotes systematic underforecasting."""
    synthetic_records = [
        {"forecast_generation_mw": 500.0, "actual_generation_mw": 800.0},
        {"forecast_generation_mw": 600.0, "actual_generation_mw": 700.0},
    ]
    # Errors: -300, -100 -> Bias = -200
    res = metrics_service.calculate_metrics(synthetic_records)
    assert res.bias_mw == -200.0
    assert res.mae_mw == 200.0


def test_metrics_zero_actual_denominator_wape():
    """Verify WAPE is undefined (None) when actual generation sum is 0."""
    synthetic_records = [
        {"forecast_generation_mw": 100.0, "actual_generation_mw": 0.0},
        {"forecast_generation_mw": 50.0,  "actual_generation_mw": 0.0},
    ]
    res = metrics_service.calculate_metrics(synthetic_records)
    assert res.matched_observations == 2
    assert res.mae_mw == 75.0
    assert res.wape_percent is None  # Undefined denominator


def test_metrics_missing_values_filtered():
    """Verify records with missing forecast or missing actual are excluded from matched metrics."""
    synthetic_records = [
        {"forecast_generation_mw": 1000.0, "actual_generation_mw": 1000.0},
        {"forecast_generation_mw": None,   "actual_generation_mw": 1000.0},
        {"forecast_generation_mw": 1000.0, "actual_generation_mw": None},
    ]
    res = metrics_service.calculate_metrics(synthetic_records, total_expected=3)
    assert res.matched_observations == 1
    assert res.mae_mw == 0.0
    assert res.bias_mw == 0.0
    assert res.forecast_coverage_percent == 33.33


def test_grouped_metrics():
    """Verify grouping by date, settlement period, and hour."""
    synthetic_records = [
        {
            "delivery_start_time": "2026-01-02T00:00:00Z",
            "purchase_decision_date": "2026-01-01",
            "settlement_period": 1,
            "forecast_generation_mw": 5000.0,
            "actual_generation_mw": 4800.0,
        },
        {
            "delivery_start_time": "2026-01-02T00:30:00Z",
            "purchase_decision_date": "2026-01-01",
            "settlement_period": 2,
            "forecast_generation_mw": 5100.0,
            "actual_generation_mw": 5000.0,
        },
        {
            "delivery_start_time": "2026-01-03T01:00:00Z",
            "purchase_decision_date": "2026-01-02",
            "settlement_period": 3,
            "forecast_generation_mw": 6000.0,
            "actual_generation_mw": 6100.0,
        },
    ]
    by_date = metrics_service.calculate_grouped_by_date(synthetic_records)
    assert len(by_date) == 2
    assert by_date[0].group_key == "2026-01-01"
    assert by_date[0].metrics.matched_observations == 2

    by_sp = metrics_service.calculate_grouped_by_settlement_period(synthetic_records)
    assert len(by_sp) == 3

    by_hr = metrics_service.calculate_grouped_by_hour(synthetic_records)
    assert len(by_hr) == 2
