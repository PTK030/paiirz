"""Chat event handlers.

Covers: messages, typing indicators, reactions, vanish mode, view-once,
screenshot alerts, unsend, contact sharing, and user blocking.
"""

import logging

from flask import request
from flask_socketio import SocketIO, emit

from ..services.rate_limiter import check as rl_check
from ..services.room_service import get_partner_sid, remove_room
from ..data.state import (
    blocked_until,
    message_timestamps,
    persistent_blocks,
    rooms,
    user_profiles,
)

logger = logging.getLogger(__name__)

# Byte limits are ~5% above raw sizes to account for AES-GCM ciphertext overhead.
_MAX_IMAGE_BYTES = 9 * 1024 * 1024
_MAX_VIDEO_BYTES = 24 * 1024 * 1024
_MAX_CONTACT_CHARS = 1000
# Encrypted text is base64 ciphertext, comfortably larger than the plaintext -
# this rejects abusive payloads while leaving generous room for real messages.
_MAX_MESSAGE_CHARS = 20_000


def register(sio: SocketIO) -> None:
    """Attach all chat-related handlers to the SocketIO instance."""
    sio.on_event("message", _on_message)
    sio.on_event("message_reaction", _on_message_reaction)
    sio.on_event("typing", _on_typing)
    sio.on_event("toggle_vanish", _on_toggle_vanish)
    sio.on_event("screenshot_taken", _on_screenshot_taken)
    sio.on_event("view_once_consumed", _on_view_once_consumed)
    sio.on_event("unsend_message", _on_unsend_message)
    sio.on_event("share_contact", _on_share_contact)
    sio.on_event("block_user", _on_block_user)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def _on_message(data: dict) -> None:
    """Validate, rate-limit, and broadcast a chat message (text/image/audio/video)."""
    sid = request.sid
    room_id = data.get("room")
    message = data.get("message")
    image = data.get("image")
    audio = data.get("audio")
    video = data.get("video")

    if not room_id or not any([message, image, audio, video]):
        return
    if not all(isinstance(v, str) or v is None for v in (message, image, audio, video)):
        return

    if image and len(image) > _MAX_IMAGE_BYTES:
        return
    if video and len(video) > _MAX_VIDEO_BYTES:
        return
    if message and len(message) > _MAX_MESSAGE_CHARS:
        return

    result = rl_check(sid, message_timestamps, blocked_until)
    if not result.allowed:
        emit(
            "rate_limit_warning",
            {
                "message": "Piszesz za szybko! Blokada antyspamowa.",
                "duration": result.blocked_for,
            },
            to=sid,
        )
        return

    emit(
        "message",
        {
            "id": data.get("id"),
            "sid": sid,
            "message": message,
            "image": image,
            "audio": audio,
            "video": video,
            "vanishing": data.get("vanishing"),
            "viewOnce": data.get("viewOnce"),
            "e2e": data.get("e2e"),
            "reactions": {},
        },
        to=room_id,
    )


def _on_message_reaction(data: dict) -> None:
    """Relay an emoji reaction on a message to the other room participant."""
    room_id = data.get("room")
    message_id = data.get("messageId")
    if room_id and message_id:
        emit(
            "message_reaction",
            {
                "messageId": message_id,
                "sid": request.sid,
                "reaction": data.get("reaction"),
            },
            to=room_id,
            include_self=False,
        )


def _on_typing(data: dict) -> None:
    """Relay a typing-indicator toggle to the other room participant."""
    room_id = data.get("room")
    if room_id:
        emit(
            "typing",
            {
                "sid": request.sid,
                "typing": data.get("typing"),
            },
            to=room_id,
            include_self=False,
        )


def _on_toggle_vanish(data: dict) -> None:
    """Relay a vanish-mode toggle to the other room participant."""
    room_id = data.get("room")
    if room_id:
        emit(
            "vanish_toggled",
            {
                "sid": request.sid,
                "active": data.get("active"),
            },
            to=room_id,
            include_self=False,
        )


def _on_screenshot_taken(data: dict) -> None:
    """Notify the other room participant that a screenshot was taken."""
    room_id = data.get("room")
    if room_id:
        emit(
            "stranger_took_screenshot",
            {
                "sid": request.sid,
                "viewOnce": data.get("viewOnce", False),
            },
            to=room_id,
            include_self=False,
        )


def _on_view_once_consumed(data: dict) -> None:
    """Notify the other room participant that a view-once media item was opened."""
    room_id = data.get("room")
    message_id = data.get("messageId")
    if room_id and message_id:
        emit(
            "view_once_consumed",
            {
                "messageId": message_id,
                "sid": request.sid,
            },
            to=room_id,
            include_self=False,
        )


def _on_unsend_message(data: dict) -> None:
    """Notify the other room participant that a message was unsent."""
    room_id = data.get("room")
    message_id = data.get("messageId")
    if room_id and message_id:
        emit(
            "message_unsent",
            {
                "messageId": message_id,
                "sid": request.sid,
            },
            to=room_id,
            include_self=False,
        )


def _on_share_contact(data: dict) -> None:
    """Store the sender's contact and exchange contacts once both sides have shared."""
    sid = request.sid
    room_id = data.get("room")
    contact = data.get("contact")

    if not room_id or room_id not in rooms:
        return
    if not contact or not isinstance(contact, str):
        return

    contact = contact[:_MAX_CONTACT_CHARS].strip()
    rooms[room_id]["contacts"][sid] = contact

    partner_sid = get_partner_sid(room_id, sid)
    if not partner_sid:
        return

    partner_contact = rooms[room_id]["contacts"].get(partner_sid)
    if partner_contact:
        # Both sides have shared - exchange simultaneously.
        emit("contact_exchanged", {"contact": partner_contact}, to=sid)
        emit("contact_exchanged", {"contact": contact}, to=partner_sid)
    else:
        emit("partner_wants_to_exchange", to=partner_sid)


def _on_block_user(data: dict) -> None:
    """Persistently block the room partner and tear down the shared room."""
    sid = request.sid
    room_id = data.get("room")

    if not room_id or room_id not in rooms:
        return
    if sid not in rooms[room_id]["users"]:
        return

    partner_sid = get_partner_sid(room_id, sid)
    if partner_sid:
        _register_block(sid, partner_sid)

    emit("room_left", "blocked", to=room_id)
    remove_room(room_id)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _register_block(blocker_sid: str, target_sid: str) -> None:
    """Add a persistent block entry using only hashed identifiers."""
    p_blocker = user_profiles.get(blocker_sid)
    p_target = user_profiles.get(target_sid)
    if not p_blocker or not p_target:
        return

    my_ids = {p_blocker.get("peerId"), p_blocker.get("ip")} - {None}
    target_ids = {p_target.get("peerId"), p_target.get("ip")} - {None}

    for my_id in my_ids:
        persistent_blocks.setdefault(my_id, set()).update(target_ids)
