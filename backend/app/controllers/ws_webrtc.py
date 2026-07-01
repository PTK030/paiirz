"""WebRTC signaling relay and E2EE key exchange handlers.

The server is a blind relay only - it forwards packets between peers without
ever having access to the ECDH shared secret, plaintext, or media streams.
"""

import logging

from flask import request
from flask_socketio import SocketIO, emit

from ..data.state import rooms

logger = logging.getLogger(__name__)

# A base64-encoded P-256 raw public key is 88 characters.
# The 200-char cap gives headroom for different encodings while rejecting
# obviously oversized or malformed input.
_MAX_PUBLIC_KEY_LENGTH = 200


def register(sio: SocketIO) -> None:
    """Attach WebRTC and E2EE handlers to the SocketIO instance."""
    sio.on_event("e2e_key_exchange", _on_e2e_key_exchange)
    sio.on_event("webrtc_signal", _on_webrtc_signal)


def _on_e2e_key_exchange(data: dict) -> None:
    """Handle E2E key exchange signaling."""
    room_id = data.get("room")
    public_key = data.get("publicKey")

    if not _room_exists(room_id) or not isinstance(public_key, str):
        return
    if len(public_key) > _MAX_PUBLIC_KEY_LENGTH:
        return

    emit(
        "e2e_key_exchange",
        {
            "sender_sid": request.sid,
            "publicKey": public_key,
        },
        to=room_id,
        include_self=False,
    )


def _on_webrtc_signal(data: dict) -> None:
    """Relay WebRTC signaling data between peers."""
    room_id = data.get("room")
    if not _room_exists(room_id):
        return

    emit(
        "webrtc_signal",
        {
            "sender_sid": request.sid,
            "signal": data.get("signal"),
        },
        to=room_id,
        include_self=False,
    )


def _room_exists(room_id) -> bool:
    return bool(room_id and room_id in rooms)
