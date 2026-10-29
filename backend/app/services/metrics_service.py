import math
from typing import List, Dict, Any, Optional
import numpy as np
from app.schemas.responses import AccuracyMetrics, GroupedAccuracy


class MetricsService:
    """
    Computes statistical accuracy metrics for matched wind forecasts and actuals.
    Strictly adheres to documented sign convention and mathematical validity rules.
    """

    @staticmethod
    def calculate_metrics(
        records: List[Dict[str, Any]], total_expected: Optional[int] = None
    ) -> AccuracyMetrics:
        """
        Compute MAE, RMSE, Bias, and WAPE across a set of timeseries records.
        Records without both forecast_generation_mw and actual_generation_mw are excluded.
        """
        valid_pairs = [
            r for r in records
            if r.get("forecast_generation_mw") is not None
            and r.get("actual_generation_mw") is not None
        ]

        matched_n = len(valid_pairs)
        expected_n = total_expected if total_expected is not None else len(records)
        coverage_pct = round((matched_n / expected_n * 100.0), 2) if expected_n > 0 else 0.0

        if matched_n == 0:
            return AccuracyMetrics(
                matched_observations=0,
                mae_mw=None,
                rmse_mw=None,
                bias_mw=None,
                wape_percent=None,
                forecast_mean_mw=None,
                actual_mean_mw=None,
                forecast_coverage_percent=coverage_pct,
            )

        forecasts = np.array([r["forecast_generation_mw"] for r in valid_pairs], dtype=float)
        actuals = np.array([r["actual_generation_mw"] for r in valid_pairs], dtype=float)

        # Signed error = forecast - actual (Positive => Overforecasting)
        errors = forecasts - actuals
        abs_errors = np.abs(errors)

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))
        f_mean = float(np.mean(forecasts))
        a_mean = float(np.mean(actuals))

        # WAPE = sum(|error|) / sum(actual) * 100
        # Only valid if sum(actual) > 0
        sum_actual = float(np.sum(actuals))
        wape = None
        if sum_actual > 0:
            wape = round(float((np.sum(abs_errors) / sum_actual) * 100.0), 2)

        return AccuracyMetrics(
            matched_observations=matched_n,
            mae_mw=round(mae, 2),
            rmse_mw=round(rmse, 2),
            bias_mw=round(bias, 2),
            wape_percent=wape,
            forecast_mean_mw=round(f_mean, 2),
            actual_mean_mw=round(a_mean, 2),
            forecast_coverage_percent=coverage_pct,
        )

    @classmethod
    def calculate_grouped_by_date(
        cls, records: List[Dict[str, Any]]
    ) -> List[GroupedAccuracy]:
        """Group records by purchase_decision_date (or delivery settlement_date)."""
        by_date: Dict[str, List[Dict[str, Any]]] = {}
        for r in records:
            d = r.get("purchase_decision_date") or r.get("settlement_date")
            by_date.setdefault(d, []).append(r)

        result = []
        for d in sorted(by_date.keys()):
            items = by_date[d]
            m = cls.calculate_metrics(items, total_expected=len(items))
            result.append(
                GroupedAccuracy(
                    group_key=d,
                    label=f"Decision Date: {d}",
                    metrics=m,
                )
            )
        return result

    @classmethod
    def calculate_grouped_by_settlement_period(
        cls, records: List[Dict[str, Any]]
    ) -> List[GroupedAccuracy]:
        """Group records by settlement_period (1 to 48)."""
        by_sp: Dict[int, List[Dict[str, Any]]] = {}
        for r in records:
            sp = r.get("settlement_period", 1)
            by_sp.setdefault(sp, []).append(r)

        result = []
        for sp in sorted(by_sp.keys()):
            items = by_sp[sp]
            m = cls.calculate_metrics(items, total_expected=len(items))
            # Format period to time: e.g. SP 1 = 00:00-00:30
            mins = (sp - 1) * 30
            h = mins // 60
            mn = mins % 60
            result.append(
                GroupedAccuracy(
                    group_key=str(sp),
                    label=f"SP {sp} ({h:02d}:{mn:02d})",
                    metrics=m,
                )
            )
        return result

    @classmethod
    def calculate_grouped_by_hour(
        cls, records: List[Dict[str, Any]]
    ) -> List[GroupedAccuracy]:
        """Group records by hour of day (0 to 23)."""
        by_hr: Dict[int, List[Dict[str, Any]]] = {}
        for r in records:
            st = r.get("delivery_start_time", "")
            try:
                # extract hour from ISO string
                hr = int(st[11:13])
            except Exception:
                hr = 0
            by_hr.setdefault(hr, []).append(r)

        result = []
        for hr in sorted(by_hr.keys()):
            items = by_hr[hr]
            m = cls.calculate_metrics(items, total_expected=len(items))
            result.append(
                GroupedAccuracy(
                    group_key=f"{hr:02d}",
                    label=f"{hr:02d}:00 - {hr:02d}:59 UTC",
                    metrics=m,
                )
            )
        return result


metrics_service = MetricsService()
