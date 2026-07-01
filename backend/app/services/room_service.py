"""Room lifecycle management.

All mutations to the rooms dict go through these functions so that the
room data structure has exactly one place to be created, read, and deleted.
"""

import logging
import uuid
from typing import Optional

from ..data.state import rooms

logger = logging.getLogger(__name__)


def generate_room_id() -> str:
    """Return a unique, collision-proof room identifier."""
    return f"room_{uuid.uuid4().hex[:12]}"


def create_room(room_id: str, owner_sid: str) -> dict:
    """Initialise a new room in global state and return it."""
    room: dict = {
        "users": [owner_sid],
        "contacts": {owner_sid: None},
        "active_games": {},
    }
    rooms[room_id] = room
    logger.debug("Room created: %s (owner=%s)", room_id, owner_sid)
    return room


def find_room_for_user(sid: str) -> Optional[str]:
    """Return the room_id the given SID belongs to, or None."""
    return next(
        (room_id for room_id, data in rooms.items() if sid in data["users"]),
        None,
    )


def get_partner_sid(room_id: str, sid: str) -> Optional[str]:
    """Return the other user's SID in a two-person room, or None."""
    users = rooms.get(room_id, {}).get("users", [])
    return next((u for u in users if u != sid), None)


def remove_room(room_id: str) -> None:
    """Remove a room from global state."""
    rooms.pop(room_id, None)
    logger.debug("Room removed: %s", room_id)
