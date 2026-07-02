"""Room lifecycle management for random (matchmaking) rooms.

All mutations to the `rooms` dict for matchmaking-created rooms go through
these functions so that the room data structure (see `RoomData` in
`data/state.py`) has exactly one place to be created, read, and deleted.
Private (invite-code) rooms are created directly in `ws_private_rooms.py`
instead, since they need extra fields (`is_private`, `owner_sid`, ...) that
don't apply to the random-matchmaking flow.
"""

import logging
import uuid
from typing import Optional

from ..data.state import rooms

logger = logging.getLogger(__name__)


def generate_room_id() -> str:
    """Return a unique, collision-proof room identifier.

    Uses a random UUID4 suffix (not a counter) so room IDs are unguessable -
    a client should never be able to enumerate or predict another room's ID.
    """
    return f"room_{uuid.uuid4().hex[:12]}"


def create_room(room_id: str, owner_sid: str) -> dict:
    """Initialise a new random-matchmaking room in global state and return it.

    The creator is the room's sole occupant until `find_compatible_room`
    matches a second user into it (see `services/matchmaking.py`).
    """
    room: dict = {
        "users": [owner_sid],
        "contacts": {owner_sid: None},
        "active_games": {},
    }
    rooms[room_id] = room
    logger.debug("Room created: %s (owner=%s)", room_id, owner_sid)
    return room


def find_room_for_user(sid: str) -> Optional[str]:
    """Return the room_id the given SID belongs to, or None.

    Used on disconnect to locate (and tear down) a user's room without the
    caller needing to track the room_id itself across the connection's
    lifetime.
    """
    return next(
        (room_id for room_id, data in rooms.items() if sid in data["users"]),
        None,
    )


def get_partner_sid(room_id: str, sid: str) -> Optional[str]:
    """Return the other user's SID in a two-person room, or None.

    Returns None both when the room only has one occupant (still waiting
    for a match) and when the room doesn't exist - callers treat both cases
    identically ("no partner to notify").
    """
    users = rooms.get(room_id, {}).get("users", [])
    return next((u for u in users if u != sid), None)


def remove_room(room_id: str) -> None:
    """Remove a room from global state.

    Idempotent by design (`dict.pop` with a default): callers don't need to
    check existence first, since a disconnect and an explicit "leave" can
    race to remove the same room.
    """
    rooms.pop(room_id, None)
    logger.debug("Room removed: %s", room_id)
