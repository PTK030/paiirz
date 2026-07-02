"""Geodesic distance calculation used by radius-based matchmaking.

`services/matchmaking.py` calls `haversine` to check whether two users'
self-reported GPS coordinates fall within each other's configured search
radius. A single well-tested pure function here keeps that distance math
out of the matchmaking logic and trivially unit-testable in isolation.
"""

import math


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two GPS points.

    Uses the haversine formula, which is accurate enough for city-scale
    matchmaking radii and cheap to compute (no external geo library needed).
    """
    R = 6371.0  # Earth's mean radius in kilometres.
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
