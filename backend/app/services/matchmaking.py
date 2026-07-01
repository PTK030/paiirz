"""Matchmaking logic: compatibility checks and room assignment.

All functions are pure (no side effects, no global state mutations) to keep
them trivially unit-testable. State is passed in explicitly as arguments.
"""

import logging
from typing import Optional

from ..utils.math import haversine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def find_compatible_room(
    sid: str,
    rooms: dict,
    profiles: dict,
    blocks: dict,
) -> Optional[str]:
    """Return the first waiting room whose sole occupant is compatible with sid."""
    for room_id, data in rooms.items():
        if len(data["users"]) == 1:
            waiting_sid = data["users"][0]
            if are_compatible(sid, waiting_sid, profiles, blocks):
                return room_id
    return None


def are_compatible(
    sid1: str,
    sid2: str,
    profiles: dict,
    blocks: dict,
) -> bool:
    """Return True if two users can be matched.

    Checks in order: block list → gender preference → age range → location.
    Any missing/None preference is treated as "no restriction".
    """
    if is_blocked(sid1, sid2, profiles, blocks):
        return False

    p1 = profiles.get(sid1)
    p2 = profiles.get(sid2)
    if not p1 or not p2:
        return True  # no preferences set → always compatible

    return _gender_match(p1, p2) and _age_match(p1, p2) and _location_match(p1, p2)


def is_blocked(
    sid1: str,
    sid2: str,
    profiles: dict,
    blocks: dict,
) -> bool:
    """Return True if either user has blocked the other.

    Only hashed identifiers are compared - raw IPs are never stored.
    """
    p1 = profiles.get(sid1)
    p2 = profiles.get(sid2)
    if not p1 or not p2:
        return False

    # In local dev both peers share the same IP; skip block check to prevent
    # developers from blocking themselves during testing.
    if p1.get("is_localhost") and p2.get("is_localhost"):
        return False

    ids1 = {p1.get("peerId"), p1.get("ip")} - {None}
    ids2 = {p2.get("peerId"), p2.get("ip")} - {None}

    for my_id in ids1:
        if blocks.get(my_id, set()) & ids2:
            return True

    for their_id in ids2:
        if blocks.get(their_id, set()) & ids1:
            return True

    return False


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _gender_match(p1: dict, p2: dict) -> bool:
    tg1 = p1.get("targetGender", "any")
    tg2 = p2.get("targetGender", "any")
    return (tg1 == "any" or tg1 == p2.get("gender", "any")) and (
        tg2 == "any" or tg2 == p1.get("gender", "any")
    )


def _age_match(p1: dict, p2: dict) -> bool:
    return _within_range(p2.get("age"), p1.get("ageMin"), p1.get("ageMax")) and _within_range(
        p1.get("age"), p2.get("ageMin"), p2.get("ageMax")
    )


def _within_range(age: Optional[int], min_age: Optional[int], max_age: Optional[int]) -> bool:
    if age is None:
        return True
    if min_age is not None and age < min_age:
        return False
    if max_age is not None and age > max_age:
        return False
    return True


def _location_match(p1: dict, p2: dict) -> bool:
    lat1, lon1 = p1.get("lat"), p1.get("lon")
    lat2, lon2 = p2.get("lat"), p2.get("lon")
    rad1, rad2 = p1.get("radius"), p2.get("radius")

    # If either user hasn't shared GPS, skip location filtering entirely.
    if None in (lat1, lon1, lat2, lon2):
        return True

    # If neither user set a radius, any distance is fine.
    if rad1 is None and rad2 is None:
        return True

    dist = haversine(lat1, lon1, lat2, lon2)
    if rad1 is not None and dist > rad1:
        return False
    if rad2 is not None and dist > rad2:
        return False
    return True
