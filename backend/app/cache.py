"""Cache abstraction with two interchangeable backends.

- ``MemoryCache`` — in-process dict with TTL (default, no infra needed).
- ``RedisCache`` — Redis via ``redis-py``, activated when ``REDIS_URL`` is set.

Both expose the same ``get``/``set``/``delete``/``incr`` interface and store
JSON-serializable values (numbers, strings, dicts, lists).
"""
from __future__ import annotations

import json
import threading
import time
from abc import ABC, abstractmethod
from typing import Any, Optional

from .config import settings


class Cache(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[Any]: ...

    @abstractmethod
    def set(self, key: str, value: Any, ttl: int = 60) -> None: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def incr(self, key: str, amount: int = 1) -> int: ...


class MemoryCache(Cache):
    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._expiry: dict[str, float] = {}
        # RLock: incr() holds the lock while calling get(), so the lock must be
        # re-entrant (a plain Lock deadlocks on the first incr call).
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            exp = self._expiry.get(key)
            if exp is not None and exp < time.monotonic():
                self._store.pop(key, None)
                self._expiry.pop(key, None)
                return None
            return self._store.get(key)

    def set(self, key: str, value: Any, ttl: int = 60) -> None:
        with self._lock:
            self._store[key] = value
            self._expiry[key] = time.monotonic() + ttl

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)
            self._expiry.pop(key, None)

    def incr(self, key: str, amount: int = 1) -> int:
        with self._lock:
            cur = self.get(key) or 0
            new = int(cur) + amount
            self._store[key] = new
            self._expiry[key] = self._expiry.get(key) or (time.monotonic() + 60)
            return new


class RedisCache(Cache):
    def __init__(self) -> None:
        import redis  # local import so app runs without redis package in edge cases

        self._client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

    def get(self, key: str) -> Optional[Any]:
        raw = self._client.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    def set(self, key: str, value: Any, ttl: int = 60) -> None:
        self._client.setex(key, ttl, json.dumps(value))

    def delete(self, key: str) -> None:
        self._client.delete(key)

    def incr(self, key: str, amount: int = 1) -> int:
        return self._client.incrby(key, amount)


_cache: Optional[Cache] = None


def get_cache() -> Cache:
    """Return the process-wide cache singleton."""
    global _cache
    if _cache is None:
        _cache = RedisCache() if settings.REDIS_URL else MemoryCache()
    return _cache


def clear_cache() -> None:
    """Reset the singleton (used in tests)."""
    global _cache
    _cache = None
