"""Centralised in-memory application state.

Rooms and user sessions are intentionally ephemeral: they exist only for the
duration of a WebSocket connection. No persistence layer is required - this
is the core privacy guarantee of the application (no chat history, no logs).

Thread-safety note: Flask-SocketIO runs on a single-threaded eventlet/gevent
loop by default. All event handlers are executed serially within that loop,
so these plain dicts and sets are safe to use without explicit locking.
If you ever switch to multi-threading, add threading.Lock() guards here.

Room schema:
    {
        "users":              list[str],           # ordered SIDs in the room
        "contacts":           dict[str, str|None],  # SID → encrypted contact
        "active_games":       dict[str, dict],      # game_id → game state
        # --- private rooms only ---
        "is_private":         bool,
        "owner_sid":          str,
        "no_screenshots":     bool,
        "notify_on_tab_leave": bool,
    }
"""
import typing
from typing import Optional

# We use total=False so that private room fields are optional without requiring Python 3.11+ NotRequired
class RoomData(typing.TypedDict, total=False):
    users: list[str]
    contacts: dict[str, Optional[str]]
    active_games: dict[str, dict]
    is_private: bool
    owner_sid: str
    no_screenshots: bool
    notify_on_tab_leave: bool

class UserProfile(typing.TypedDict, total=False):
    peerId: Optional[str]
    ip: Optional[str]
    is_localhost: bool
    gender: str
    targetGender: str
    age: Optional[int]
    ageMin: Optional[int]
    ageMax: Optional[int]
    lat: Optional[float]
    lon: Optional[float]
    radius: Optional[int]

# Active rooms keyed by room_id.
rooms: dict[str, RoomData] = {}

# SIDs of all currently connected WebSocket clients.
connected_users: set[str] = set()

# Per-user matching profile and hashed network identifiers.
# { sid: { "peerId": hash, "ip": hash, "gender": str, ... } }
user_profiles: dict[str, UserProfile] = {}

# Cross-session block list.
# { hashed_id: set_of_blocked_hashed_ids }
# Survives individual disconnects but NOT server restarts - by design.
persistent_blocks: dict[str, set[str]] = {}

# Sliding-window rate-limit: recent message timestamps per SID.
# { sid: [unix_timestamp, ...] }
message_timestamps: dict[str, list[float]] = {}

# Absolute UNIX timestamp until which a SID is rate-limited.
# { sid: float }
blocked_until: dict[str, float] = {}
