"""
Rate Limiting Middleware — GoAuct
Uses Redis (already available) for sliding window rate limiting.
No new dependencies required.

Usage:
    from app.core.rate_limit import rate_limit
    
    @router.post("/login/access-token")
    @rate_limit(max_requests=10, window_seconds=60, key_prefix="login")
    def login_endpoint(request: Request, ...):
        ...
"""
import time
import logging
from functools import wraps
from typing import Callable

from fastapi import HTTPException, Request
import redis as redis_lib

from app.core.config import settings
from app.core.logger import logger

# Setup Redis client (reuse config from users.py pattern)
try:
    _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    _redis_client.ping()
    _REDIS_AVAILABLE = True
except Exception as e:
    logger.warning(f"[RateLimit] Redis unavailable, rate limiting disabled: {e}")
    _redis_client = None
    _REDIS_AVAILABLE = False


def get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting Cloudflare/proxy headers."""
    # Check CF-Connecting-IP (Cloudflare)
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip
    # Check X-Forwarded-For (standard proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    # Fallback to direct client
    return request.client.host if request.client else "unknown"


def check_rate_limit(
    ip: str,
    key_prefix: str,
    max_requests: int,
    window_seconds: int,
) -> None:
    """
    Sliding window rate limiter using Redis.
    Raises HTTP 429 if the limit is exceeded.
    Silently passes if Redis is unavailable (fail-open).
    """
    if not _REDIS_AVAILABLE or not _redis_client:
        return  # Fail open — don't block users if Redis is down

    key = f"rl:{key_prefix}:{ip}"
    now = time.time()
    window_start = now - window_seconds

    try:
        pipe = _redis_client.pipeline()
        # Remove entries outside the sliding window
        pipe.zremrangebyscore(key, 0, window_start)
        # Count remaining entries in the window
        pipe.zcard(key)
        # Add current timestamp
        pipe.zadd(key, {str(now): now})
        # Set TTL on the key so it auto-expires
        pipe.expire(key, window_seconds + 1)
        results = pipe.execute()

        request_count = results[1]  # Count before adding current request
        if request_count >= max_requests:
            retry_after = int(window_seconds - (now - window_start))
            logger.warning(
                f"[RateLimit] Rate limit exceeded",
                extra={"ip": ip, "key_prefix": key_prefix, "count": request_count}
            )
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
    except HTTPException:
        raise
    except Exception as e:
        # Fail open on Redis errors — log but don't block the user
        logger.error(f"[RateLimit] Redis error (fail-open): {e}")


def rate_limit(max_requests: int = 10, window_seconds: int = 60, key_prefix: str = "default"):
    """
    Decorator for FastAPI route handlers.
    
    Args:
        max_requests: Maximum number of requests allowed in the window.
        window_seconds: Sliding window size in seconds.
        key_prefix: Unique prefix to namespace this limiter (e.g. 'login', 'register').
    
    Example:
        @router.post("/login/access-token")
        @rate_limit(max_requests=10, window_seconds=60, key_prefix="login")
        def login(request: Request, ...):
    
    Note: 'request: Request' MUST be a parameter in the decorated function.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            if request:
                ip = get_client_ip(request)
                check_rate_limit(ip, key_prefix, max_requests, window_seconds)
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            if request:
                ip = get_client_ip(request)
                check_rate_limit(ip, key_prefix, max_requests, window_seconds)
            return func(*args, **kwargs)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
