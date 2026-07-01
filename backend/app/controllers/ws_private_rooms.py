"""Private room event handlers.

Private rooms are invite-only: users share a 6-character code out-of-band
and both connect using that code. No matchmaking algorithm is involved.
"""

import logging

from flask import request
from flask_socketio import SocketIO, emit, join_room

from ..data.state import rooms

logger = logging.getLogger(__name__)

_ROOM_CODE_LENGTH = 6
_MAX_USERS_PER_ROOM = 2


def register(sio: SocketIO) -> None:
    """Attach private room handlers to the SocketIO instance."""
    sio.on_event("create_private_room", _on_create_private_room)
    sio.on_event("join_private_room", _on_join_private_room)
    sio.on_event("tab_visibility_change", _on_tab_visibility_change)


def _on_create_private_room(data: dict) -> None:
    """Create a new invite-only room keyed by a client-supplied code."""
    sid = request.sid
    room_code = data.get("roomCode", "")

    if len(room_code) != _ROOM_CODE_LENGTH:
        emit("private_room_error", {"message": "Nieprawidłowy kod pokoju."}, to=sid)
        return

    room_id = _to_room_id(room_code)
    if room_id in rooms:
        emit(
            "private_room_error",
            {"message": "Pokój z tym kodem już istnieje. Spróbuj ponownie."},
            to=sid,
        )
        return

    rooms[room_id] = {
        "users": [sid],
        "contacts": {sid: None},
        "active_games": {},
        "is_private": True,
        "owner_sid": sid,
        "no_screenshots": bool(data.get("noScreenshots", False)),
        "notify_on_tab_leave": bool(data.get("notifyOnTabLeave", False)),
    }
    join_room(room_id)
    emit("private_room_created", {"room": room_id, "code": room_code}, to=sid)
    logger.info("Private room created: %s by %s", room_id, sid)


def _on_join_private_room(data: dict) -> None:
    """Join an existing private room by its code, if it has capacity."""
    sid = request.sid
    room_code = data.get("roomCode", "")

    if not room_code:
        emit("private_room_error", {"message": "Brakuje kodu pokoju."}, to=sid)
        return

    room_id = _to_room_id(room_code)
    room_data = rooms.get(room_id)

    if not room_data:
        emit("private_room_error", {"message": "Pokój nie istnieje lub wygasł."}, to=sid)
        return
    if len(room_data["users"]) >= _MAX_USERS_PER_ROOM:
        emit("private_room_error", {"message": "Pokój jest pełny."}, to=sid)
        return
    if sid in room_data["users"]:
        emit("private_room_error", {"message": "Już jesteś w tym pokoju."}, to=sid)
        return

    room_data["users"].append(sid)
    room_data["contacts"][sid] = None
    join_room(room_id)
    emit("room_joined", {"room": room_id, "sid": sid}, to=room_id)
    logger.info("User %s joined private room %s", sid, room_id)


def _on_tab_visibility_change(data: dict) -> None:
    """Notify the partner when the room owner enabled tab-leave alerts."""
    room_id = data.get("room")
    if not room_id or room_id not in rooms:
        return
    if rooms[room_id].get("notify_on_tab_leave"):
        emit(
            "partner_tab_hidden",
            {"hidden": data.get("hidden", False)},
            to=room_id,
            include_self=False,
        )


def _to_room_id(code: str) -> str:
    return f"private_{code}"
