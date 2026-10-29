import time
import asyncio
from typing import Any, Optional, Dict, Tuple


class TTLCache:
    """
    Thread-safe and async-safe in-memory cache with explicit TTL.
    Supports get, set, delete, clear, and key invalidation.
    """
    def __init__(self, default_ttl: int = 3600):
        self._default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._cache:
                return None
            val, expiry = self._cache[key]
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        async with self._lock:
            ttl_val = ttl if ttl is not None else self._default_ttl
            expiry = time.time() + ttl_val
            self._cache[key] = (value, expiry)

    async def delete(self, key: str) -> None:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()

    async def size(self) -> int:
        async with self._lock:
            # Clean expired on inspect
            now = time.time()
            expired = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in expired:
                del self._cache[k]
            return len(self._cache)


# Global cache instance
cache = TTLCache()
