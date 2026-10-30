"""Lightweight in-memory sliding-window rate limiter for abuse protection."""

import time
from typing import Dict, List
from fastapi import HTTPException, Request, status

from app.config import settings

# In-memory store: { client_ip: [timestamp1, timestamp2, ...] }
_request_history: Dict[str, List[float]] = {}
_LAST_CLEANUP = time.monotonic()


def get_client_ip(request: Request) -> str:
    """Extract client IP, taking the leftmost hop from X-Forwarded-For if behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Leftmost entry is the client address when passing through reverse proxies / Cloud Run
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


def cleanup_stale_entries(now: float, window_seconds: float = 60.0) -> None:
    """Periodically purge IPs that have no recent requests to prevent unbounded memory growth."""
    global _LAST_CLEANUP
    if now - _LAST_CLEANUP < 30.0:
        return

    _LAST_CLEANUP = now
    cutoff = now - window_seconds
    stale_ips = [
        ip for ip, timestamps in _request_history.items()
        if not timestamps or timestamps[-1] < cutoff
    ]
    for ip in stale_ips:
        _request_history.pop(ip, None)


def check_rate_limit(
    request: Request,
    limit: int = 20,
    window_seconds: float = 60.0,
) -> None:
    """Enforce rate limits on incoming requests based on client IP."""
    if not settings.RATE_LIMIT_ENABLED:
        return

    now = time.monotonic()
    cleanup_stale_entries(now, window_seconds)

    ip = get_client_ip(request)
    cutoff = now - window_seconds

    history = _request_history.get(ip, [])
    # Keep only timestamps within the current sliding window
    history = [ts for ts in history if ts > cutoff]

    if len(history) >= limit:
        # Calculate retry after seconds
        oldest_in_window = history[0]
        retry_after = max(1, int(window_seconds - (now - oldest_in_window)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "detail": f"Too many requests from this IP. Maximum allowed is {limit} per minute. Please wait {retry_after} seconds.",
            },
            headers={"Retry-After": str(retry_after)},
        )

    history.append(now)
    _request_history[ip] = history


def reset_rate_limiter() -> None:
    """Reset all stored rate limit histories (used for test isolation)."""
    _request_history.clear()
