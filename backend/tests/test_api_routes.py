import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from datetime import date

client = TestClient(app)


def test_health_endpoint():
    """Verify /api/health returns 200 and expected schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "upstream_url" in data


def test_invalid_parameters_validation():
    """Verify malformed query parameters return 422 Unprocessable Entity."""
    # Invalid month format (e.g. not YYYY-MM)
    response = client.get("/api/overview?decision_month=2026/01")
    assert response.status_code == 422

    # Invalid cutoff time format
    response = client.get("/api/timeseries?cutoff_time=25:99")
    assert response.status_code == 422

    # Invalid delivery date in forecast-versions
    response = client.get("/api/forecast-versions?delivery_date=01-01-2026")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_overview_endpoint_mocked():
    """Verify /api/overview schema with synthetic mocked Elexon data."""
    synthetic_actuals = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T01:00:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 10000,
        }
    ]
    synthetic_forecasts = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T10:00:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 10500,
        }
    ]

    with patch("app.services.forecast_service.elexon_client.fetch_fuelhh_wind_actuals", new_callable=AsyncMock) as mock_act, \
         patch("app.services.forecast_service.elexon_client.fetch_windfor_forecasts", new_callable=AsyncMock) as mock_fc:
        mock_act.return_value = synthetic_actuals
        mock_fc.return_value = synthetic_forecasts

        response = client.get("/api/overview?decision_month=2026-01&refresh=true")
        assert response.status_code == 200
        data = response.json()
        assert data["decision_month"] == "2026-01"
        assert "metrics" in data
        assert "forecast_coverage_percent" in data
        assert "matched_intervals" in data


@pytest.mark.asyncio
async def test_timeseries_endpoint_mocked():
    """Verify /api/timeseries schema with synthetic mocked Elexon data."""
    synthetic_actuals = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T01:00:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 10000,
        }
    ]
    synthetic_forecasts = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T10:00:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 10500,
        }
    ]

    with patch("app.services.forecast_service.elexon_client.fetch_fuelhh_wind_actuals", new_callable=AsyncMock) as mock_act, \
         patch("app.services.forecast_service.elexon_client.fetch_windfor_forecasts", new_callable=AsyncMock) as mock_fc:
        mock_act.return_value = synthetic_actuals
        mock_fc.return_value = synthetic_forecasts

        response = client.get("/api/timeseries?decision_month=2026-01&refresh=true")
        assert response.status_code == 200
        data = response.json()
        assert "records" in data
        assert len(data["records"]) > 0
        r0 = data["records"][0]
        assert "delivery_start_time" in r0
        assert "signed_error_mw" in r0
        assert "absolute_error_mw" in r0


@pytest.mark.asyncio
async def test_data_quality_endpoint_mocked():
    """Verify /api/data-quality returns audit stats and notes."""
    with patch("app.services.forecast_service.elexon_client.fetch_fuelhh_wind_actuals", new_callable=AsyncMock) as mock_act, \
         patch("app.services.forecast_service.elexon_client.fetch_windfor_forecasts", new_callable=AsyncMock) as mock_fc:
        mock_act.return_value = []
        mock_fc.return_value = []

        response = client.get("/api/data-quality?decision_month=2026-01&refresh=true")
        assert response.status_code == 200
        data = response.json()
        assert "total_expected_half_hours" in data
        assert "methodology_notes" in data
        assert len(data["methodology_notes"]) > 0
