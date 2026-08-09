"""MemoryCache and cache-singleton tests (REDIS_URL unset in tests)."""
import time

from app.cache import MemoryCache, clear_cache, get_cache


def test_set_get_roundtrip():
    cache = MemoryCache()
    cache.set("k", {"a": 1})
    assert cache.get("k") == {"a": 1}


def test_get_missing_returns_none():
    assert MemoryCache().get("nope") is None


def test_ttl_expiry():
    cache = MemoryCache()
    cache.set("k", "v", ttl=-1)  # expiry in the past -> expired immediately
    assert cache.get("k") is None


def test_delete():
    cache = MemoryCache()
    cache.set("k", "v")
    cache.delete("k")
    assert cache.get("k") is None


def test_incr_accumulates():
    cache = MemoryCache()
    assert cache.incr("counter") == 1
    assert cache.incr("counter") == 2
    assert cache.incr("counter", 5) == 7


def test_get_cache_singleton_and_clear():
    clear_cache()
    one = get_cache()
    two = get_cache()
    assert one is two
    clear_cache()
    assert get_cache() is not one
