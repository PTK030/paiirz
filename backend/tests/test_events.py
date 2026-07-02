"""Integration tests for all WebSocket event handlers.

Uses Flask-SocketIO's built-in test client which emulates a real WebSocket
connection without starting an actual server. State is cleared before every
test via the `reset_state` autouse fixture.

Args format note:
    Flask-SocketIO test client stores received event args differently depending
    on how the server emitted the event:
      - broadcast=True or direct emit → args is a list: event["args"][0]
      - to=room_id (room-targeted) → args is the payload dict: event["args"]
    Use _get_data(event) to handle both cases uniformly.
"""

import app.data.state as state
import pytest
from app.extensions import socketio

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def reset_state():
    """Guarantee clean in-memory state for every test."""
    _clear()
    yield
    _clear()


def _clear():
    state.rooms.clear()
    state.connected_users.clear()
    state.user_profiles.clear()
    state.persistent_blocks.clear()
    state.message_timestamps.clear()
    state.blocked_until.clear()


@pytest.fixture
def client(app):
    c = socketio.test_client(app)
    yield c
    if c.is_connected():
        c.disconnect()


@pytest.fixture
def client2(app):
    c = socketio.test_client(app)
    yield c
    if c.is_connected():
        c.disconnect()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_data(event: dict) -> dict:
    """Return event payload as a dict regardless of delivery mode.

    - broadcast / direct emit: args is a list → return args[0]
    - to=room_id (room-targeted): args is the dict itself → return args
    """
    args = event["args"]
    return args[0] if isinstance(args, list) else args


def _names(received: list) -> list[str]:
    return [e["name"] for e in received]


def _find(received: list, name: str) -> dict | None:
    return next((e for e in received if e["name"] == name), None)


def _join_pair(c1, c2) -> str:
    """Join two clients into a room and return the authoritative room_id from state."""
    c1.emit("join", {})
    c1.get_received()
    c2.emit("join", {})
    c2.get_received()
    # Get room_id from state - more reliable than parsing received events
    return next(iter(state.rooms))


# ---------------------------------------------------------------------------
# HTTP Routes
# ---------------------------------------------------------------------------


class TestUserCountRoute:
    def test_returns_connected_count(self, app, client):
        with app.test_client() as http:
            resp = http.get("/api/users/count")
            assert resp.status_code == 200
            assert "user_count" in resp.get_json()


# ---------------------------------------------------------------------------
# Connection events
# ---------------------------------------------------------------------------


class TestConnection:
    def test_connect_adds_to_connected_users(self, client):
        assert len(state.connected_users) == 1

    def test_connect_broadcasts_user_count(self, client):
        received = client.get_received()
        evt = _find(received, "user_count")
        assert evt is not None
        assert _get_data(evt)["count"] >= 1

    def test_disconnect_removes_from_connected_users(self, client):
        assert len(state.connected_users) == 1
        client.disconnect()
        assert len(state.connected_users) == 0

    def test_disconnect_cleans_up_room(self, client, client2):
        _join_pair(client, client2)
        assert len(state.rooms) == 1
        client.disconnect()
        assert len(state.rooms) == 0

    def test_disconnect_emits_room_left(self, client, client2):
        _join_pair(client, client2)
        client.disconnect()
        assert "room_left" in _names(client2.get_received())


class TestJoin:
    def test_first_client_gets_room_created(self, client):
        client.emit("join", {})
        assert "room_created" in _names(client.get_received())

    def test_creates_room_in_state(self, client):
        client.emit("join", {})
        assert len(state.rooms) == 1

    def test_second_compatible_client_gets_room_joined(self, client, client2):
        client.emit("join", {})
        client.get_received()
        client2.emit("join", {})
        assert "room_joined" in _names(client2.get_received())

    def test_join_stores_user_profile(self, client):
        client.emit("join", {"gender": "male", "targetGender": "female", "age": "25"})
        sid = next(iter(state.user_profiles))
        profile = state.user_profiles[sid]
        assert profile["gender"] == "male"
        assert profile["age"] == 25

    def test_join_hashes_ip_not_stores_raw(self, client):
        client.emit("join", {})
        profile = next(iter(state.user_profiles.values()))
        # Raw "127.0.0.1" must not be stored; only the SHA-256 hash
        assert profile["ip"] != "127.0.0.1"
        assert profile["ip"] is None or len(profile["ip"]) == 64

    def test_join_with_none_data_uses_defaults(self, client):
        client.emit("join", None)
        profile = next(iter(state.user_profiles.values()))
        assert profile["gender"] == "any"
        assert profile["targetGender"] == "any"


class TestJoinEdgeCases:
    def test_join_with_invalid_float_lat_falls_back_to_none(self, client):
        """Covers the ValueError path in _safe_float (no isdigit guard for floats)."""
        client.emit("join", {"lat": "not-a-float", "lon": "also-bad"})
        profile = next(iter(state.user_profiles.values()))
        assert profile["lat"] is None
        assert profile["lon"] is None


class TestLeave:
    def test_leave_removes_room(self, client):
        client.emit("join", {})
        client.get_received()
        room_id = next(iter(state.rooms))
        client.emit("leave", {"room": room_id})
        assert room_id not in state.rooms

    def test_leave_unknown_room_is_safe(self, client):
        client.emit("leave", {"room": "nonexistent_room"})
        assert client.is_connected()


# ---------------------------------------------------------------------------
# Chat events
# ---------------------------------------------------------------------------


class TestMessage:
    def test_message_is_relayed_to_room(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("message", {"room": room_id, "message": "hello", "id": "msg1"})

        evt = _find(client2.get_received(), "message")
        assert evt is not None
        payload = _get_data(evt)
        assert payload["message"] == "hello"
        assert "image" not in payload
        assert "video" not in payload
        assert "audio" not in payload
        assert "e2e" not in payload

    def test_message_without_room_is_ignored(self, client, client2):
        _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("message", {"message": "no room"})
        assert _find(client2.get_received(), "message") is None

    def test_message_without_content_is_ignored(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("message", {"room": room_id})
        assert _find(client2.get_received(), "message") is None

    def test_oversized_image_is_rejected(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        oversized = "x" * (18 * 1024 * 1024 + 1)
        client.emit("message", {"room": room_id, "image": oversized})
        assert _find(client2.get_received(), "message") is None

    def test_oversized_video_is_rejected(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        oversized = "x" * (46 * 1024 * 1024 + 1)
        client.emit("message", {"room": room_id, "video": oversized})
        assert _find(client2.get_received(), "message") is None

    def test_rate_limit_blocks_after_burst(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()

        for i in range(6):
            client.emit("message", {"room": room_id, "message": f"msg{i}"})

        assert "rate_limit_warning" in _names(client.get_received())


class TestTyping:
    def test_typing_relayed_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("typing", {"room": room_id, "typing": True})
        assert "typing" in _names(client2.get_received())

    def test_typing_not_sent_to_self(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()

        client.emit("typing", {"room": room_id, "typing": True})
        assert _find(client.get_received(), "typing") is None


class TestMessageReaction:
    def test_reaction_relayed_with_correct_data(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit(
            "message_reaction", {"room": room_id, "messageId": "m1", "reaction": "❤️"}
        )
        evt = _find(client2.get_received(), "message_reaction")
        assert evt is not None
        assert _get_data(evt)["reaction"] == "❤️"


class TestVanishMode:
    def test_toggle_vanish_relayed_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("toggle_vanish", {"room": room_id, "active": True})
        assert "vanish_toggled" in _names(client2.get_received())


class TestScreenshot:
    def test_screenshot_relayed_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("screenshot_taken", {"room": room_id, "viewOnce": False})
        assert "stranger_took_screenshot" in _names(client2.get_received())


class TestViewOnce:
    def test_view_once_consumed_relayed(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("view_once_consumed", {"room": room_id, "messageId": "m1"})
        assert "view_once_consumed" in _names(client2.get_received())


class TestUnsend:
    def test_unsend_relayed_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("unsend_message", {"room": room_id, "messageId": "m1"})
        assert "message_unsent" in _names(client2.get_received())


class TestShareContact:
    def test_partner_notified_when_one_side_shares(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit(
            "share_contact", {"room": room_id, "contact": "encrypted_contact_a"}
        )
        assert "partner_wants_to_exchange" in _names(client2.get_received())

    def test_exchange_completes_when_both_share(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("share_contact", {"room": room_id, "contact": "contact_a"})
        client2.get_received()  # consume partner_wants_to_exchange

        client2.emit("share_contact", {"room": room_id, "contact": "contact_b"})
        assert "contact_exchanged" in _names(client.get_received())
        assert "contact_exchanged" in _names(client2.get_received())

    def test_invalid_contact_type_is_ignored(self, client, client2):
        room_id = _join_pair(client, client2)
        client2.get_received()

        client.emit("share_contact", {"room": room_id, "contact": 12345})
        assert _find(client2.get_received(), "partner_wants_to_exchange") is None

    def test_contact_without_room_is_ignored(self, client):
        client.emit("share_contact", {"contact": "test"})
        assert client.is_connected()


class TestShareContactEdge:
    def test_share_contact_alone_in_room_is_safe(self, client):
        """Covers the 'no partner_sid' guard in _on_share_contact."""
        client.emit("join", {})
        client.get_received()
        room_id = next(iter(state.rooms))

        # Client is alone - share_contact must not crash
        client.emit("share_contact", {"room": room_id, "contact": "my_contact"})
        assert client.is_connected()


class TestBlockUser:
    def test_block_removes_room(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("block_user", {"room": room_id})
        assert room_id not in state.rooms

    def test_block_emits_room_left_to_both(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("block_user", {"room": room_id})
        assert "room_left" in _names(client2.get_received())

    def test_block_unknown_room_is_safe(self, client):
        client.emit("block_user", {"room": "ghost_room"})
        assert client.is_connected()

    def test_block_non_member_sid_is_ignored(self, client):
        """Covers the 'sid not in room users' guard in _on_block_user."""
        # Room exists but with fake users - client's SID is not among them
        state.rooms["room_fake"] = {
            "users": ["fake_sid_1", "fake_sid_2"],
            "contacts": {},
            "active_games": {},
        }
        client.emit("block_user", {"room": "room_fake"})
        # Room must remain untouched (handler returned early)
        assert "room_fake" in state.rooms

    def test_register_block_with_missing_profiles_is_safe(self):
        """Covers the missing-profile guard in _register_block."""
        from app.controllers.ws_chat import _register_block

        _register_block("unknown_sid", "also_unknown")
        assert len(state.persistent_blocks) == 0

    def test_register_block_persists_hashed_identifiers(self, client, client2):
        """Verify _register_block stores blocks using hashed IDs (unit test).

        Note: In the SocketIO test client, request.remote_addr is None, so the
        ip field in profiles is also None. We inject valid hashed identifiers
        manually to test the blocking logic independently of network plumbing.
        """
        _join_pair(client, client2)
        users = list(state.rooms[next(iter(state.rooms))]["users"])
        sid1, sid2 = users[0], users[1]

        # Inject distinguishable hashed IDs (simulates real hashed network IDs)
        state.user_profiles[sid1]["ip"] = "aaaaaa_hashed_ip_of_user_1"
        state.user_profiles[sid2]["ip"] = "bbbbbb_hashed_ip_of_user_2"

        from app.controllers.ws_chat import _register_block

        _register_block(sid1, sid2)

        assert len(state.persistent_blocks) > 0


# ---------------------------------------------------------------------------
# WebRTC / E2EE events
# ---------------------------------------------------------------------------


class TestE2EKeyExchange:
    def test_key_forwarded_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        valid_key = "A" * 88
        client.emit("e2e_key_exchange", {"room": room_id, "publicKey": valid_key})

        evt = _find(client2.get_received(), "e2e_key_exchange")
        assert evt is not None
        assert _get_data(evt)["publicKey"] == valid_key

    def test_oversized_key_is_rejected(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("e2e_key_exchange", {"room": room_id, "publicKey": "x" * 201})
        assert _find(client2.get_received(), "e2e_key_exchange") is None

    def test_non_string_key_is_rejected(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("e2e_key_exchange", {"room": room_id, "publicKey": 12345})
        assert _find(client2.get_received(), "e2e_key_exchange") is None

    def test_unknown_room_is_ignored(self, client):
        client.emit("e2e_key_exchange", {"room": "ghost", "publicKey": "A" * 88})
        assert client.is_connected()


class TestWebRTCSignal:
    def test_signal_forwarded_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("webrtc_signal", {"room": room_id, "signal": {"type": "offer"}})
        evt = _find(client2.get_received(), "webrtc_signal")
        assert evt is not None
        assert _get_data(evt)["signal"]["type"] == "offer"

    def test_unknown_room_is_ignored(self, client):
        client.emit("webrtc_signal", {"room": "ghost", "signal": {}})
        assert client.is_connected()

    def test_call_hangup_is_forwarded_to_partner(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit(
            "webrtc_signal",
            {"room": room_id, "signal": {"type": "call-hangup"}},
        )

        evt = _find(client2.get_received(), "webrtc_signal")
        assert evt is not None
        assert _get_data(evt)["signal"]["type"] == "call-hangup"


# ---------------------------------------------------------------------------
# Private rooms
# ---------------------------------------------------------------------------


class TestPrivateRooms:
    def test_create_private_room_succeeds(self, client):
        client.emit("create_private_room", {"roomCode": "ABC123"})
        assert "private_room_created" in _names(client.get_received())
        assert "private_ABC123" in state.rooms

    def test_create_with_short_code_fails(self, client):
        client.emit("create_private_room", {"roomCode": "AB"})
        assert "private_room_error" in _names(client.get_received())

    def test_create_duplicate_code_fails(self, client, client2):
        client.emit("create_private_room", {"roomCode": "ABC123"})
        client.get_received()

        client2.emit("create_private_room", {"roomCode": "ABC123"})
        assert "private_room_error" in _names(client2.get_received())

    def test_join_private_room_succeeds(self, client, client2):
        client.emit("create_private_room", {"roomCode": "XYZ999"})
        client.get_received()

        client2.emit("join_private_room", {"roomCode": "XYZ999"})
        assert "room_joined" in _names(client2.get_received())

    def test_join_nonexistent_room_fails(self, client):
        client.emit("join_private_room", {"roomCode": "NOPE00"})
        assert "private_room_error" in _names(client.get_received())

    def test_join_full_room_fails(self, client):
        """A room already at capacity (2 users) must reject further joins."""
        state.rooms["private_FULL99"] = {
            "users": ["fake_sid_1", "fake_sid_2"],
            "contacts": {},
            "active_games": {},
            "is_private": True,
        }
        client.emit("join_private_room", {"roomCode": "FULL99"})
        assert "private_room_error" in _names(client.get_received())

    def test_join_room_already_member_fails(self, client):
        """Covers the 'already in room' guard in _on_join_private_room."""
        client.emit("create_private_room", {"roomCode": "MINE11"})
        client.get_received()

        # Same client tries to join their own room again
        client.emit("join_private_room", {"roomCode": "MINE11"})
        assert "private_room_error" in _names(client.get_received())

    def test_join_room_with_empty_code_fails(self, client):
        client.emit("join_private_room", {"roomCode": ""})
        assert "private_room_error" in _names(client.get_received())

    def test_tab_visibility_notifies_partner_when_flag_set(self, client, client2):
        client.emit(
            "create_private_room", {"roomCode": "TAB123", "notifyOnTabLeave": True}
        )
        client.get_received()
        client2.emit("join_private_room", {"roomCode": "TAB123"})
        client2.get_received()
        client.get_received()

        client.emit("tab_visibility_change", {"room": "private_TAB123", "hidden": True})
        assert "partner_tab_hidden" in _names(client2.get_received())

    def test_tab_visibility_silent_when_flag_not_set(self, client, client2):
        client.emit(
            "create_private_room", {"roomCode": "NOTAB1", "notifyOnTabLeave": False}
        )
        client.get_received()
        client2.emit("join_private_room", {"roomCode": "NOTAB1"})
        client2.get_received()
        client.get_received()

        client.emit("tab_visibility_change", {"room": "private_NOTAB1", "hidden": True})
        assert _find(client2.get_received(), "partner_tab_hidden") is None

    def test_tab_visibility_unknown_room_is_safe(self, client):
        client.emit("tab_visibility_change", {"room": "ghost"})
        assert client.is_connected()


# ---------------------------------------------------------------------------
# Icebreaker games - This or That
# ---------------------------------------------------------------------------


def _get_game_id(room_id: str) -> str:
    """Return the first active game ID in the given room."""
    return next(iter(state.rooms[room_id]["active_games"]))


def _force_game_status(room_id: str, game_id: str, status: str):
    state.rooms[room_id]["active_games"][game_id]["status"] = status


class TestIcebreakerThisOrThat:
    def test_trigger_emits_system_message(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        evt = _find(client.get_received(), "message")
        assert evt is not None
        data = _get_data(evt)
        assert data["sid"] == "system"
        assert data["icebreaker"]["type"] == "this_or_that"
        assert "result" not in data["icebreaker"]
        assert "voter_sid" not in data["icebreaker"]

    def test_trigger_with_custom_question(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit(
            "trigger_icebreaker",
            {
                "room": room_id,
                "type": "this_or_that",
                "customData": {
                    "question": "Pies czy kot?",
                    "options": ["Pies 🐕", "Kot 🐈"],
                },
            },
        )
        evt = _find(client.get_received(), "message")
        icebreaker = _get_data(evt)["icebreaker"]
        assert icebreaker["question"] == "Pies czy kot?"
        assert len(icebreaker["options"]) == 2
        assert icebreaker["options"][0].startswith("Pies")
        assert icebreaker["options"][1].startswith("Kot")
        assert icebreaker["is_custom"] is True

    def test_invalid_game_type_is_ignored(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "poker"})
        assert _find(client.get_received(), "message") is None

    def test_accept_changes_status_to_pending(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)

        client2.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "accept"},
        )
        evt = _find(client2.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "pending"

    def test_decline_changes_status_to_declined(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)

        client2.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "decline"},
        )
        evt = _find(client2.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "declined"

    def test_quit_changes_status_to_quit(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "quit"},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "quit"

    def test_vote_reveals_when_both_voted(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "pending")

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "vote", "action": 0},
        )
        client.get_received()  # drain c1's icebreaker_updated (status=pending)
        client2.get_received()  # drain c2's icebreaker_updated from c1's vote

        client2.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "vote", "action": 1},
        )
        # Now c2's queue has only the revealed event
        evt = _find(client2.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"

    def test_invalid_vote_action_keeps_status(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "pending")

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "vote", "action": 99},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "pending"

    def test_next_round_resets_and_increments_round(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)

        game = state.rooms[room_id]["active_games"][game_id]
        game["status"] = "revealed"
        game["votes"] = {users[0]: 0, users[1]: 1}

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "next_round"},
        )
        client.get_received()
        client2.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "next_round"},
        )

        evts = [e for e in client2.get_received() if e["name"] == "icebreaker_updated"]
        last = _get_data(evts[-1])["icebreaker"]
        assert last["status"] == "pending"
        assert last["round"] == 2

    def test_unknown_message_id_is_ignored(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": "ghost_id", "actionType": "accept"},
        )
        assert _find(client.get_received(), "icebreaker_updated") is None

    def test_action_without_message_id_is_ignored(self, client, client2):
        """Covers the early-return guard in _on_action_icebreaker (L73)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("action_icebreaker", {"room": room_id, "actionType": "accept"})
        assert _find(client.get_received(), "icebreaker_updated") is None

    def test_accept_when_already_pending_is_ignored(self, client, client2):
        """Covers the status guard in _handle_accept (L165)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "pending")

        # Accept on a game that is already pending (not proposed)
        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "accept"},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "pending"  # unchanged

    def test_vote_on_proposed_game_is_ignored(self, client, client2):
        """Covers the status guard in _handle_vote (L184)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        # Game is still "proposed" - vote must be rejected

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "vote", "action": 0},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "proposed"  # unchanged

    def test_next_round_on_truth_or_dare_is_ignored(self, client, client2):
        """Covers the game-type guard in _handle_next_round (L212)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "truth_or_dare"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "revealed")

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "next_round"},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"  # unchanged

    def test_complete_turn_on_this_or_that_is_ignored(self, client, client2):
        """Covers the game-type guard in _handle_complete_turn (L232)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "revealed")

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "complete_turn"},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"  # unchanged

    def test_skip_on_this_or_that_is_ignored(self, client, client2):
        """Covers the game-type guard in _handle_skip_question (L261)."""
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "this_or_that"})
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        _force_game_status(room_id, game_id, "revealed")

        client.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "skip_question"},
        )
        evt = _find(client.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"  # unchanged


# ---------------------------------------------------------------------------
# Icebreaker games - Truth or Dare
# ---------------------------------------------------------------------------


class TestIcebreakerTruthOrDare:
    def _setup_tod(self, client, client2, room_id, custom_data=None):
        """Trigger a truth_or_dare game and return (game_id, turn_sid, users)."""
        payload = {"room": room_id, "type": "truth_or_dare"}
        if custom_data:
            payload["customData"] = custom_data
        client.emit("trigger_icebreaker", payload)
        client.get_received()
        client2.get_received()
        game_id = _get_game_id(room_id)
        turn_sid = state.rooms[room_id]["active_games"][game_id]["turn_sid"]
        users = list(state.rooms[room_id]["users"])
        return game_id, turn_sid, users

    def test_trigger_truth_or_dare(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        client.emit("trigger_icebreaker", {"room": room_id, "type": "truth_or_dare"})
        game_id = _get_game_id(room_id)
        assert state.rooms[room_id]["active_games"][game_id]["type"] == "truth_or_dare"

    def test_trigger_with_custom_truth(self, client, client2):
        room_id = _join_pair(client, client2)
        client.get_received()
        client2.get_received()

        game_id, _, _ = self._setup_tod(
            client, client2, room_id, {"choice": "truth", "text": "Custom question?"}
        )
        game = state.rooms[room_id]["active_games"][game_id]
        assert game["is_custom"] is True
        assert game["result"] == "Custom question?"

        client2.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "accept"},
        )
        evt = _find(client2.get_received(), "icebreaker_updated")
        icebreaker = _get_data(evt)["icebreaker"]
        assert icebreaker["status"] == "revealed"
        assert icebreaker["result"] == "Custom question?"

    def test_vote_truth_reveals_question(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        _force_game_status(room_id, game_id, "pending")
        active = client if turn_sid == users[0] else client2

        active.emit(
            "action_icebreaker",
            {
                "room": room_id,
                "messageId": game_id,
                "actionType": "vote",
                "action": "truth",
            },
        )
        evt = _find(active.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"
        assert _get_data(evt)["icebreaker"]["question"] == "Prawda"

    def test_vote_dare_reveals_challenge(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        _force_game_status(room_id, game_id, "pending")
        active = client if turn_sid == users[0] else client2

        active.emit(
            "action_icebreaker",
            {
                "room": room_id,
                "messageId": game_id,
                "actionType": "vote",
                "action": "dare",
            },
        )
        evt = _find(active.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["question"] == "Wyzwanie"

    def test_wrong_player_cannot_vote(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        _force_game_status(room_id, game_id, "pending")
        inactive = client2 if turn_sid == users[0] else client

        inactive.emit(
            "action_icebreaker",
            {
                "room": room_id,
                "messageId": game_id,
                "actionType": "vote",
                "action": "truth",
            },
        )
        evt = _find(inactive.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["status"] == "pending"

    def test_complete_turn_switches_player(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        partner_sid = next(u for u in users if u != turn_sid)
        game = state.rooms[room_id]["active_games"][game_id]
        game.update(
            {
                "status": "revealed",
                "votes": {turn_sid: "truth"},
                "voter_sid": turn_sid,
                "result": "Q",
                "ready_for_next": [],
            }
        )

        active = client if turn_sid == users[0] else client2
        inactive = client2 if turn_sid == users[0] else client

        active.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "complete_turn"},
        )
        active.get_received()
        inactive.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "complete_turn"},
        )

        evts = [e for e in inactive.get_received() if e["name"] == "icebreaker_updated"]
        last = _get_data(evts[-1])["icebreaker"]
        assert last["status"] == "pending"
        assert last["turn_sid"] == partner_sid

    def test_skip_question_redraws_prompt(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        game = state.rooms[room_id]["active_games"][game_id]
        game.update(
            {
                "status": "revealed",
                "votes": {turn_sid: "truth"},
                "voter_sid": turn_sid,
                "result": "Original",
            }
        )

        active = client if turn_sid == users[0] else client2
        active.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "skip_question"},
        )

        evt = _find(active.get_received(), "icebreaker_updated")
        new_result = _get_data(evt)["icebreaker"]["result"]
        assert isinstance(new_result, str) and len(new_result) > 0

    def test_complete_turn_non_voter_before_voter_is_ignored(self, client, client2):
        """Covers the voter-order guard in _handle_complete_turn (L238)."""
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        game = state.rooms[room_id]["active_games"][game_id]
        game.update(
            {
                "status": "revealed",
                "votes": {turn_sid: "truth"},
                "voter_sid": turn_sid,
                "result": "Q",
                "ready_for_next": [],
            }
        )

        # The non-voter (inactive) tries to complete turn before the voter does
        inactive = client2 if turn_sid == users[0] else client
        inactive.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "complete_turn"},
        )

        evt = _find(inactive.get_received(), "icebreaker_updated")
        # Status must remain revealed (guard rejected the premature complete)
        assert _get_data(evt)["icebreaker"]["status"] == "revealed"

    def test_reject_turn_clears_voter_ready(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        game = state.rooms[room_id]["active_games"][game_id]
        game.update(
            {
                "status": "revealed",
                "votes": {turn_sid: "truth"},
                "voter_sid": turn_sid,
                "result": "Q",
                "ready_for_next": [turn_sid],
            }
        )

        inactive = client2 if turn_sid == users[0] else client
        inactive.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "reject_turn"},
        )

        evt = _find(inactive.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["ready_for_next"] == []

    def test_skip_with_no_vote_category_is_ignored(self, client, client2):
        """Covers the category guard in _handle_skip_question (L266)."""
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        game = state.rooms[room_id]["active_games"][game_id]
        # Simulate revealed with NO vote entry (category = None)
        game.update(
            {"status": "revealed", "votes": {}, "voter_sid": turn_sid, "result": "X"}
        )

        active = client if turn_sid == users[0] else client2
        active.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "skip_question"},
        )
        evt = _find(active.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["result"] == "X"  # unchanged

    def test_non_voter_cannot_skip(self, client, client2):
        room_id = _join_pair(client, client2)
        users = list(state.rooms[room_id]["users"])
        client.get_received()
        client2.get_received()

        game_id, turn_sid, _ = self._setup_tod(client, client2, room_id)
        game = state.rooms[room_id]["active_games"][game_id]
        game.update(
            {
                "status": "revealed",
                "votes": {turn_sid: "dare"},
                "voter_sid": turn_sid,
                "result": "Original",
            }
        )

        inactive = client2 if turn_sid == users[0] else client
        inactive.emit(
            "action_icebreaker",
            {"room": room_id, "messageId": game_id, "actionType": "skip_question"},
        )

        evt = _find(inactive.get_received(), "icebreaker_updated")
        assert _get_data(evt)["icebreaker"]["result"] == "Original"
