"""Sliding-window rate limiter for WebSocket message events.

Stateless functions: all mutable state (timestamps, blocks) is passed in
explicitly, which makes this module trivially unit-testable and keeps it
decoupled from Flask's request context.
"""

import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_MAX_MESSAGES = 5  # maximum messages allowed within the window
_WINDOW_SECONDS = 3.0  # sliding window duration in seconds
_BLOCK_DURATION = 5.0  # how long to block a user after violation, in seconds


@dataclass(frozen=True)
class RateLimitResult:
    """Outcome of a rate-limit check."""

    allowed: bool
    blocked_for: int = 0  # seconds remaining; 0 when allowed


def check(sid: str, timestamps: dict, blocked: dict) -> RateLimitResult:
    """Check and update rate-limit state for a given SID.

    Algorithm:
        1. If the user is in an active block, reject immediately.
        2. Slide the window - discard timestamps older than WINDOW_SECONDS.
        3. Append the current timestamp.
        4. If the window now holds more than MAX_MESSAGES, impose a block.

    Args:
        sid:        The SocketIO session ID being checked.
        timestamps: Shared dict mapping sid → list of recent timestamps.
        blocked:    Shared dict mapping sid → block-expiry UNIX timestamp.

    Returns:
        RateLimitResult with allowed=True, or allowed=False and blocked_for > 0.
    """
    now = time.time()

    block_expires = blocked.get(sid, 0.0)
    if now < block_expires:
        return RateLimitResult(allowed=False, blocked_for=int(block_expires - now) + 1)

    window = [t for t in timestamps.get(sid, []) if now - t <= _WINDOW_SECONDS]
    window.append(now)
    timestamps[sid] = window

    if len(window) > _MAX_MESSAGES:
        blocked[sid] = now + _BLOCK_DURATION
        logger.debug(
            "Rate limit exceeded for %s - blocking for %ds", sid, int(_BLOCK_DURATION)
        )
        return RateLimitResult(allowed=False, blocked_for=int(_BLOCK_DURATION))

    return RateLimitResult(allowed=True)


def cleanup(sid: str, timestamps: dict, blocked: dict) -> None:
    """Remove all rate-limit state for a disconnected user."""
    timestamps.pop(sid, None)
    blocked.pop(sid, None)
