import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class ElexonClient:
    """
    Client for interacting with Elexon BMRS API (Insights Solution) datasets.
    Restricted strictly to FUELHH and WINDFOR streams.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.ELEXON_BASE_URL
        self.timeout = settings.REQUEST_TIMEOUT_SECONDS
        self.max_retries = settings.MAX_RETRIES

    async def _get_with_retry(self, url: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute GET request with exponential backoff on transient errors."""
        headers = {
            "User-Agent": "WindIntelligence/1.0 (UK Wind Forecast Accuracy Dashboard)",
            "Accept": "application/json",
        }
        
        last_exception = None
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list):
                            return data
                        elif isinstance(data, dict) and "data" in data:
                            return data["data"]
                        return []
                    elif response.status_code in (429, 500, 502, 503, 504):
                        logger.warning(
                            f"Elexon upstream returned HTTP {response.status_code} for {url}. "
                            f"Attempt {attempt}/{self.max_retries}."
                        )
                    else:
                        response.raise_for_status()
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_exception = exc
                logger.warning(
                    f"Elexon request failed on attempt {attempt}/{self.max_retries}: {exc}"
                )
            
            if attempt < self.max_retries:
                # Exponential backoff: 0.5s, 1.0s, 2.0s...
                await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
        
        if last_exception:
            logger.error(f"Elexon request permanently failed after {self.max_retries} attempts: {last_exception}")
            raise last_exception
        return []

    async def fetch_fuelhh_wind_actuals(
        self, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch actual wind generation outturn records from FUELHH stream.
        Dates in YYYY-MM-DD format. Filtered strictly to fuelType=WIND.
        """
        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": start_date,
            "settlementDateTo": end_date,
            "fuelType": "WIND",
        }
        logger.info(f"Fetching FUELHH wind actuals from {start_date} to {end_date}")
        records = await self._get_with_retry(url, params)
        logger.info(f"Retrieved {len(records)} FUELHH wind records")
        return records

    async def fetch_windfor_forecasts_chunk(
        self, publish_from: str, publish_to: str
    ) -> List[Dict[str, Any]]:
        """Fetch WINDFOR forecast stream records for a specific publication time window."""
        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to,
        }
        return await self._get_with_retry(url, params)

    async def fetch_windfor_forecasts(
        self, publish_start: datetime, publish_end: datetime, chunk_days: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR forecast records over a date range using parallel chunked queries
        to ensure bounded payload sizes and resilience against upstream timeouts.
        """
        logger.info(f"Fetching WINDFOR forecasts from {publish_start} to {publish_end}")
        tasks = []
        cur = publish_start
        while cur < publish_end:
            next_cur = min(cur + timedelta(days=chunk_days), publish_end)
            from_str = cur.strftime("%Y-%m-%dT%H:%M:%SZ")
            to_str = next_cur.strftime("%Y-%m-%dT%H:%M:%SZ")
            tasks.append(self.fetch_windfor_forecasts_chunk(from_str, to_str))
            cur = next_cur

        chunk_results = await asyncio.gather(*tasks, return_exceptions=True)
        all_records: List[Dict[str, Any]] = []
        for r in chunk_results:
            if isinstance(r, list):
                all_records.extend(r)
            elif isinstance(r, Exception):
                logger.error(f"Error in WINDFOR chunk fetch: {r}")
                raise r

        logger.info(f"Retrieved total {len(all_records)} WINDFOR forecast records")
        return all_records


# Global client instance
elexon_client = ElexonClient()
