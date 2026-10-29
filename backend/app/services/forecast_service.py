import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, time, timedelta, timezone
import pandas as pd
from dateutil import parser
from app.core.config import settings
from app.services.elexon_client import elexon_client

logger = logging.getLogger(__name__)


def parse_utc(ts_str: str) -> datetime:
    """Parse an ISO timestamp and ensure it is timezone-aware UTC."""
    dt = parser.isoparse(ts_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def format_utc(dt: datetime) -> str:
    """Format datetime as standard ISO 8601 UTC string."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class ForecastService:
    """
    Core domain service implementing the UK Day-Ahead wholesale market
    forecast selection methodology and matching with actual generation outturns.
    """

    def parse_cutoff_time(self, cutoff_str: Optional[str] = None) -> Tuple[int, int]:
        """Parse HH:MM cutoff string into (hour, minute)."""
        raw = cutoff_str or settings.DEFAULT_CUTOFF_TIME
        try:
            parts = raw.strip().split(":")
            return int(parts[0]), int(parts[1])
        except Exception:
            return 11, 0

    def compute_decision_cutoff(
        self, delivery_date: date, cutoff_str: Optional[str] = None
    ) -> Tuple[date, datetime]:
        """
        Given a target delivery date D, the day-ahead purchase decision is made
        on D - 1 calendar day, at the configured cutoff time (default 11:00 UTC).
        """
        decision_date = delivery_date - timedelta(days=1)
        hour, minute = self.parse_cutoff_time(cutoff_str)
        cutoff_dt = datetime.combine(
            decision_date, time(hour, minute, 0), tzinfo=timezone.utc
        )
        return decision_date, cutoff_dt

    async def get_raw_datasets_for_cohort(
        self, decision_month: str
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], date, date]:
        """
        Fetch WINDFOR forecasts and FUELHH actuals covering the January 2026 decision cohort.
        For decision_month=2026-01:
          - Purchase decisions made: 2026-01-01 to 2026-01-31
          - Target delivery dates:   2026-01-02 to 2026-02-01
        WINDFOR query buffer:
          - Publishes from 2025-12-25 to 2026-01-31 23:59:59Z
        FUELHH query:
          - Settlement dates from 2026-01-02 to 2026-02-01
        """
        parts = decision_month.split("-")
        year = int(parts[0])
        month = int(parts[1])

        # Delivery start is day after first decision day of the month
        first_decision = date(year, month, 1)
        delivery_start_date = first_decision + timedelta(days=1)

        # Last decision of month
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        last_decision = next_month - timedelta(days=1)
        delivery_end_date = last_decision + timedelta(days=1)

        # WINDFOR forecasts could be published a few days prior to the cutoff
        # e.g. from 5 days before the first decision date up to the last cutoff
        wf_start = datetime.combine(first_decision - timedelta(days=5), time(0, 0), tzinfo=timezone.utc)
        wf_end = datetime.combine(last_decision + timedelta(days=1), time(23, 59, 59), tzinfo=timezone.utc)

        actuals = await elexon_client.fetch_fuelhh_wind_actuals(
            delivery_start_date.strftime("%Y-%m-%d"),
            delivery_end_date.strftime("%Y-%m-%d"),
        )

        forecasts = await elexon_client.fetch_windfor_forecasts(wf_start, wf_end)

        return actuals, forecasts, delivery_start_date, delivery_end_date

    def process_and_match(
        self,
        actuals_raw: List[Dict[str, Any]],
        forecasts_raw: List[Dict[str, Any]],
        delivery_start_date: date,
        delivery_end_date: date,
        cutoff_time_str: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Normalize timestamps, apply Day-Ahead Decision selection methodology,
        and join actuals to forecasts on the normalized target interval.
        """
        data_quality_stats = {
            "total_actuals_raw": len(actuals_raw),
            "total_forecasts_raw": len(forecasts_raw),
            "duplicate_forecasts_removed": 0,
            "duplicate_actuals_removed": 0,
            "invalid_actuals_count": 0,
            "invalid_forecasts_count": 0,
            "missing_forecasts_count": 0,
            "missing_actuals_count": 0,
        }

        # 1. Process Actuals (FUELHH)
        actuals_by_interval: Dict[str, Dict[str, Any]] = {}
        for item in actuals_raw:
            try:
                st_str = item.get("startTime")
                gen = item.get("generation")
                if not st_str or gen is None:
                    data_quality_stats["invalid_actuals_count"] += 1
                    continue
                
                st_dt = parse_utc(st_str)
                interval_key = format_utc(st_dt)
                
                # Check duplicates
                if interval_key in actuals_by_interval:
                    data_quality_stats["duplicate_actuals_removed"] += 1
                    # Deterministic resolution: keep the latest publishTime
                    existing = actuals_by_interval[interval_key]
                    existing_pub = parse_utc(existing.get("publishTime", "1970-01-01T00:00:00Z"))
                    new_pub = parse_utc(item.get("publishTime", "1970-01-01T00:00:00Z"))
                    if new_pub > existing_pub:
                        actuals_by_interval[interval_key] = item
                else:
                    actuals_by_interval[interval_key] = item
            except Exception as e:
                data_quality_stats["invalid_actuals_count"] += 1
                logger.debug(f"Error parsing actual item: {e}")

        # 2. Process Forecasts (WINDFOR)
        # Group candidate forecasts by forecast target hour
        # Note: WINDFOR has hourly startTimes (HH:00:00Z).
        # We index forecasts by the target hour datetime string.
        # Structure: forecasts_by_target_hour[target_hour_key] = list of valid version dicts
        forecasts_by_target_hour: Dict[str, List[Dict[str, Any]]] = {}
        seen_forecast_keys = set()

        for item in forecasts_raw:
            try:
                st_str = item.get("startTime")
                pt_str = item.get("publishTime")
                gen = item.get("generation")
                if not st_str or not pt_str or gen is None:
                    data_quality_stats["invalid_forecasts_count"] += 1
                    continue

                st_dt = parse_utc(st_str)
                pt_dt = parse_utc(pt_str)

                # Deterministic deduplication of identical (startTime, publishTime)
                uniq_k = (format_utc(st_dt), format_utc(pt_dt))
                if uniq_k in seen_forecast_keys:
                    data_quality_stats["duplicate_forecasts_removed"] += 1
                    continue
                seen_forecast_keys.add(uniq_k)

                target_key = format_utc(st_dt)
                if target_key not in forecasts_by_target_hour:
                    forecasts_by_target_hour[target_key] = []

                forecasts_by_target_hour[target_key].append({
                    "publish_time_dt": pt_dt,
                    "publish_time_str": format_utc(pt_dt),
                    "target_start_dt": st_dt,
                    "target_start_str": target_key,
                    "generation_mw": float(gen),
                })
            except Exception as e:
                data_quality_stats["invalid_forecasts_count"] += 1
                logger.debug(f"Error parsing forecast item: {e}")

        # 3. Build Expected Half-Hourly Intervals for Delivery Window
        matched_records: List[Dict[str, Any]] = []
        cur_date = delivery_start_date
        
        while cur_date <= delivery_end_date:
            decision_date, cutoff_dt = self.compute_decision_cutoff(cur_date, cutoff_time_str)
            cutoff_str = format_utc(cutoff_dt)
            dec_date_str = cur_date.strftime("%Y-%m-%d")

            # 48 half-hour settlement periods per standard day (or up to 50 on clock change)
            # In January, standard GMT (48 periods, each 30 mins)
            for sp in range(1, 49):
                # Half-hour offset from midnight
                minutes_offset = (sp - 1) * 30
                interval_dt = datetime.combine(cur_date, time(0, 0), tzinfo=timezone.utc) + timedelta(minutes=minutes_offset)
                interval_key = format_utc(interval_dt)

                # Actual generation outturn
                act_item = actuals_by_interval.get(interval_key)
                actual_mw = float(act_item["generation"]) if act_item and act_item.get("generation") is not None else None

                # Find candidate forecasts:
                # Since WINDFOR is published with hourly startTimes,
                # the forecast covering interval_dt (e.g. 14:00 or 14:30) is the forecast for hour 14:00.
                hour_start_dt = interval_dt.replace(minute=0, second=0, microsecond=0)
                hour_key = format_utc(hour_start_dt)
                candidates = forecasts_by_target_hour.get(hour_key, [])

                # Filter to eligible versions published BEFORE OR AT the Day-Ahead Cutoff
                eligible_versions = [
                    v for v in candidates if v["publish_time_dt"] <= cutoff_dt
                ]

                selected_forecast: Optional[Dict[str, Any]] = None
                if eligible_versions:
                    # Choose the latest valid publication available at that cutoff
                    eligible_versions.sort(key=lambda x: x["publish_time_dt"])
                    selected_forecast = eligible_versions[-1]

                forecast_mw = selected_forecast["generation_mw"] if selected_forecast else None
                forecast_pt_str = selected_forecast["publish_time_str"] if selected_forecast else None

                lead_time_hrs = None
                if selected_forecast:
                    lead_time_hrs = round(
                        (interval_dt - selected_forecast["publish_time_dt"]).total_seconds() / 3600.0,
                        2,
                    )

                # Error metrics
                signed_err = None
                abs_err = None
                pct_err = None
                status = "matched"

                if forecast_mw is not None and actual_mw is not None:
                    signed_err = round(forecast_mw - actual_mw, 2)
                    abs_err = round(abs(signed_err), 2)
                    if actual_mw > 0:
                        pct_err = round((abs_err / actual_mw) * 100.0, 2)
                elif forecast_mw is None and actual_mw is not None:
                    status = "missing_forecast"
                    data_quality_stats["missing_forecasts_count"] += 1
                elif forecast_mw is not None and actual_mw is None:
                    status = "missing_actual"
                    data_quality_stats["missing_actuals_count"] += 1
                else:
                    status = "missing_both"
                    data_quality_stats["missing_forecasts_count"] += 1
                    data_quality_stats["missing_actuals_count"] += 1

                matched_records.append({
                    "delivery_start_time": interval_key,
                    "settlement_date": cur_date.strftime("%Y-%m-%d"),
                    "settlement_period": sp,
                    "purchase_decision_date": decision_date.strftime("%Y-%m-%d"),
                    "decision_cutoff_time": cutoff_str,
                    "forecast_publish_time": forecast_pt_str,
                    "forecast_generation_mw": forecast_mw,
                    "actual_generation_mw": actual_mw,
                    "signed_error_mw": signed_err,
                    "absolute_error_mw": abs_err,
                    "percentage_error": pct_err,
                    "lead_time_hours": lead_time_hrs,
                    "status": status,
                })

            cur_date += timedelta(days=1)

        return matched_records, data_quality_stats

    def get_forecast_versions_for_date(
        self,
        delivery_date_str: str,
        forecasts_raw: List[Dict[str, Any]],
        cutoff_time_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Inspect all historical forecast versions for a single delivery date.
        Distinguishes all observed versions from the version eligible and selected at the cutoff.
        """
        target_date = datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
        decision_date, cutoff_dt = self.compute_decision_cutoff(target_date, cutoff_time_str)
        cutoff_str = format_utc(cutoff_dt)

        # Candidate forecast startTimes on that target date
        day_start_dt = datetime.combine(target_date, time(0, 0), tzinfo=timezone.utc)
        day_end_dt = datetime.combine(target_date, time(23, 59, 59), tzinfo=timezone.utc)

        versions_list: List[Dict[str, Any]] = []
        seen = set()

        for item in forecasts_raw:
            st_str = item.get("startTime")
            pt_str = item.get("publishTime")
            gen = item.get("generation")
            if not st_str or not pt_str or gen is None:
                continue

            st_dt = parse_utc(st_str)
            if not (day_start_dt <= st_dt <= day_end_dt):
                continue

            pt_dt = parse_utc(pt_str)
            key = (format_utc(st_dt), format_utc(pt_dt))
            if key in seen:
                continue
            seen.add(key)

            is_eligible = pt_dt <= cutoff_dt
            lead_time = round((st_dt - pt_dt).total_seconds() / 3600.0, 2)

            versions_list.append({
                "publish_time_dt": pt_dt,
                "publish_time": format_utc(pt_dt),
                "delivery_start_time": format_utc(st_dt),
                "forecast_generation_mw": float(gen),
                "is_eligible": is_eligible,
                "lead_time_hours": lead_time,
                "decision_cutoff_time": cutoff_str,
            })

        # Sort chronologically by publish time
        versions_list.sort(key=lambda x: (x["delivery_start_time"], x["publish_time_dt"]))

        # For each distinct interval, identify which version is selected at the cutoff
        by_interval: Dict[str, List[Dict[str, Any]]] = {}
        for v in versions_list:
            by_interval.setdefault(v["delivery_start_time"], []).append(v)

        selected_pub_times = set()
        for interval, interval_versions in by_interval.items():
            eligible = [iv for iv in interval_versions if iv["is_eligible"]]
            if eligible:
                latest_eligible = max(eligible, key=lambda x: x["publish_time_dt"])
                latest_eligible["is_selected"] = True
                selected_pub_times.add(latest_eligible["publish_time"])

        for v in versions_list:
            if "is_selected" not in v:
                v["is_selected"] = False
            del v["publish_time_dt"]

        return {
            "delivery_date": delivery_date_str,
            "decision_date": decision_date.strftime("%Y-%m-%d"),
            "decision_cutoff_time": cutoff_str,
            "selected_version_publish_time": list(selected_pub_times)[0] if selected_pub_times else None,
            "total_versions": len(versions_list),
            "eligible_versions_count": sum(1 for v in versions_list if v["is_eligible"]),
            "versions": versions_list,
        }


# Global service instance
forecast_service = ForecastService()
