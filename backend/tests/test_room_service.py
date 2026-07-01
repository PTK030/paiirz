"""Unit tests for room lifecycle management."""

import app.data.state as state
import pytest
from app.services.room_service import (
    create_room,
    find_room_for_user,
    generate_room_id,
    get_partner_sid,
    remove_room,
)


@pytest.fixture(autouse=True)
def clear_rooms():
    state.rooms.clear()
    yield
    state.rooms.clear()


class TestGenerateRoomId:
    def test_returns_string_with_room_prefix(self):
        assert generate_room_id().startswith("room_")

    def test_ids_are_unique(self):
        ids = {generate_room_id() for _ in range(100)}
        assert len(ids) == 100


class TestCreateRoom:
    def test_room_is_added_to_state(self):
        create_room("room_abc", "sid_owner")
        assert "room_abc" in state.rooms

    def test_owner_is_in_users_list(self):
        create_room("room_abc", "sid_owner")
        assert "sid_owner" in state.rooms["room_abc"]["users"]

    def test_room_has_empty_active_games(self):
        create_room("room_abc", "sid_owner")
        assert state.rooms["room_abc"]["active_games"] == {}

    def test_returns_room_dict(self):
        room = create_room("room_abc", "sid_owner")
        assert isinstance(room, dict)
        assert "users" in room


class TestFindRoomForUser:
    def test_returns_room_id_when_user_present(self):
        state.rooms["room_x"] = {"users": ["sid_a", "sid_b"]}
        assert find_room_for_user("sid_a") == "room_x"

    def test_returns_none_when_user_not_in_any_room(self):
        assert find_room_for_user("ghost") is None


class TestGetPartnerSid:
    def test_returns_partner_when_two_users(self):
        state.rooms["room_x"] = {"users": ["sid_a", "sid_b"]}
        assert get_partner_sid("room_x", "sid_a") == "sid_b"

    def test_returns_none_when_alone_in_room(self):
        state.rooms["room_x"] = {"users": ["sid_a"]}
        assert get_partner_sid("room_x", "sid_a") is None

    def test_returns_none_for_unknown_room(self):
        assert get_partner_sid("nonexistent", "sid_a") is None


class TestRemoveRoom:
    def test_removes_existing_room(self):
        state.rooms["room_x"] = {"users": []}
        remove_room("room_x")
        assert "room_x" not in state.rooms

    def test_does_not_raise_for_unknown_room(self):
        remove_room("ghost_room")  # must not raise
