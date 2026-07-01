"""Unit tests for the sliding-window rate limiter."""

import time

import pytest
from app.services.rate_limiter import _BLOCK_DURATION, _MAX_MESSAGES, check, cleanup


class TestRateLimiter:
    def test_first_message_is_allowed(self):
        ts, bl = {}, {}
        assert check("sid1", ts, bl).allowed

    def test_up_to_max_messages_are_allowed(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES):
            result = check("sid1", ts, bl)
        assert result.allowed

    def test_exceeding_limit_is_blocked(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES + 1):
            result = check("sid1", ts, bl)
        assert not result.allowed
        assert result.blocked_for == int(_BLOCK_DURATION)

    def test_blocked_user_remains_blocked(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES + 1):
            check("sid1", ts, bl)
        # Next call while still blocked
        assert not check("sid1", ts, bl).allowed

    def test_blocked_for_is_positive_on_violation(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES + 1):
            result = check("sid1", ts, bl)
        assert result.blocked_for > 0

    def test_different_sids_are_independent(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES + 1):
            check("spammer", ts, bl)
        assert check("normal_user", ts, bl).allowed

    def test_cleanup_removes_all_state(self):
        ts, bl = {}, {}
        for _ in range(_MAX_MESSAGES + 1):
            check("sid1", ts, bl)
        cleanup("sid1", ts, bl)
        assert "sid1" not in ts
        assert "sid1" not in bl

    def test_cleanup_on_unknown_sid_is_safe(self):
        """cleanup() must not raise for a SID that was never rate-limited."""
        cleanup("never_seen", {}, {})
