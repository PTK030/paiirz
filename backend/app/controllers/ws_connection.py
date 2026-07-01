"""WebSocket connection lifecycle handlers.

Covers: socket connect/disconnect (transport level) and the application-level
'join' / 'leave' events that control matchmaking queue entry and exit.
"""

import logging
from typing import Optional

from flask import current_app, request
from flask_socketio import SocketIO, emit, join_room, leave_room

from ..utils.security import hash_identifier
from ..services import matchmaking, room_service
from ..services.rate_limiter import cleanup as rl_cleanup
from ..data.state import (
    blocked_until,
    connected_users,
    message_timestamps,
    persistent_blocks,
    rooms,
    user_profiles,
)

logger = logging.getLogger(__name__)


def register(sio: SocketIO) -> None:
    """Attach connection lifecycle handlers to the SocketIO instance."""
    sio.on_event("connect", _on_connect)
    sio.on_event("join", _on_join)
    sio.on_event("leave", _on_leave)
    sio.on_event("disconnect", _on_disconnect)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def _on_connect() -> None:
    """Register a newly connected client and broadcast the updated user count."""
    sid = request.sid
    connected_users.add(sid)
    logger.info("Connected: %s (total=%d)", sid, len(connected_users))
    emit("user_count", {"count": len(connected_users)}, broadcast=True)


def _on_join(data: dict | None = None) -> None:
    """Match the client into a compatible waiting room, or open a new one."""
    sid = request.sid
    raw_ip = request.remote_addr
    salt = current_app.config["IP_SALT"]

    profile = _build_profile(data or {}, raw_ip, salt)
    user_profiles[sid] = profile

    room_id = matchmaking.find_compatible_room(sid, rooms, user_profiles, persistent_blocks)

    if room_id:
        rooms[room_id]["users"].append(sid)
        rooms[room_id]["contacts"][sid] = None
        join_room(room_id)
        emit("room_joined", {"room": room_id, "sid": sid}, to=room_id)
        logger.info("User %s joined room %s", sid, room_id)
    else:
        room_id = room_service.generate_room_id()
        room_service.create_room(room_id, sid)
        join_room(room_id)
        emit("room_created", room_id)
        logger.info("User %s created room %s", sid, room_id)


def _on_leave(data: dict) -> None:
    """Remove the client's room and notify the remaining participant, if any."""
    room_id = data.get("room")
    if room_id and room_id in rooms:
        leave_room(room_id)
        room_service.remove_room(room_id)
        emit("room_left", "somebody left", to=room_id)


def _on_disconnect() -> None:
    """Clean up all state for a disconnected client and broadcast the new count."""
    sid = request.sid
    connected_users.discard(sid)
    user_profiles.pop(sid, None)
    rl_cleanup(sid, message_timestamps, blocked_until)

    room_id = room_service.find_room_for_user(sid)
    if room_id:
        room_service.remove_room(room_id)
        emit("room_left", "somebody left", to=room_id)

    logger.info("Disconnected: %s (total=%d)", sid, len(connected_users))
    emit("user_count", {"count": len(connected_users)}, broadcast=True)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_profile(data: dict, raw_ip: str, salt: str) -> dict:
    """Parse and sanitise user preferences from a 'join' event payload."""
    is_localhost = raw_ip in ("127.0.0.1", "::1", "localhost")
    return {
        "peerId": hash_identifier(data.get("peerId"), salt),
        "ip": hash_identifier(raw_ip, salt),
        "is_localhost": is_localhost,
        "gender": data.get("gender", "any"),
        "targetGender": data.get("targetGender", "any"),
        "age": _safe_int(data.get("age")),
        "ageMin": _safe_int(data.get("ageMin")),
        "ageMax": _safe_int(data.get("ageMax")),
        "lat": _safe_float(data.get("lat")),
        "lon": _safe_float(data.get("lon")),
        "radius": _safe_int(data.get("radius")),
    }


def _safe_int(val) -> Optional[int]:
    try:
        return int(val) if val is not None and str(val).lstrip("-").isdigit() else None
    except (
        ValueError,
        TypeError,
    ):  # pragma: no cover - isdigit guard makes this unreachable
        return None


def _safe_float(val) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None
