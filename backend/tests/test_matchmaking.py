"""Unit tests for matchmaking compatibility and Haversine distance."""

import pytest
from app.services.matchmaking import are_compatible, haversine, is_blocked


class TestHaversine:
    def test_same_point_returns_zero(self):
        assert haversine(52.0, 21.0, 52.0, 21.0) == 0.0

    def test_warszawa_to_krakow_is_approx_250km(self):
        dist = haversine(52.2297, 21.0122, 50.0647, 19.9450)
        assert 245 < dist < 265

    def test_symmetry(self):
        d1 = haversine(52.0, 21.0, 50.0, 19.0)
        d2 = haversine(50.0, 19.0, 52.0, 21.0)
        assert abs(d1 - d2) < 0.001


class TestIsBlocked:
    def test_returns_false_with_empty_state(self):
        assert not is_blocked("a", "b", {}, {})

    def test_detects_direct_peer_block(self):
        profiles = {
            "a": {"peerId": "pa", "ip": "ia", "is_localhost": False},
            "b": {"peerId": "pb", "ip": "ib", "is_localhost": False},
        }
        blocks = {"pa": {"pb"}}
        assert is_blocked("a", "b", profiles, blocks)

    def test_block_is_bidirectional(self):
        profiles = {
            "a": {"peerId": "pa", "ip": "ia", "is_localhost": False},
            "b": {"peerId": "pb", "ip": "ib", "is_localhost": False},
        }
        blocks = {"pa": {"pb"}}
        # b should also be unable to reach a
        assert is_blocked("b", "a", profiles, blocks)

    def test_ip_based_block_also_detected(self):
        profiles = {
            "a": {"peerId": "pa", "ip": "ia", "is_localhost": False},
            "b": {"peerId": "pb", "ip": "ib", "is_localhost": False},
        }
        blocks = {"pa": {"ib"}}  # blocked by IP, not peer ID
        assert is_blocked("a", "b", profiles, blocks)

    def test_localhost_peers_never_block_each_other(self):
        profiles = {
            "a": {"peerId": "pa", "ip": "ia", "is_localhost": True},
            "b": {"peerId": "pb", "ip": "ib", "is_localhost": True},
        }
        blocks = {"pa": {"pb"}}
        assert not is_blocked("a", "b", profiles, blocks)

    def test_missing_profile_returns_false(self):
        assert not is_blocked("unknown", "b", {}, {})


class TestAreCompatible:
    def test_compatible_pair_matches(self, compatible_profiles):
        assert are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_both_any_gender_always_compatible(self):
        profiles = {
            "x": {
                "peerId": None,
                "ip": None,
                "is_localhost": False,
                "gender": "any",
                "targetGender": "any",
            },
            "y": {
                "peerId": None,
                "ip": None,
                "is_localhost": False,
                "gender": "any",
                "targetGender": "any",
            },
        }
        assert are_compatible("x", "y", profiles, {})

    def test_gender_mismatch_blocks_match(self, compatible_profiles):
        compatible_profiles["sid_b"]["targetGender"] = "female"  # sid_a is male
        assert not are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_age_above_max_blocks_match(self, compatible_profiles):
        compatible_profiles["sid_a"]["ageMax"] = 20  # sid_b is 23 → out of range
        assert not are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_age_below_min_blocks_match(self, compatible_profiles):
        compatible_profiles["sid_a"]["ageMin"] = 28  # sid_b is 23 → below min
        assert not are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_location_outside_radius_blocks_match(self, compatible_profiles):
        compatible_profiles["sid_a"]["radius"] = 1  # 1 km - both ~1.5 km apart
        assert not are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_no_radius_set_ignores_location(self, compatible_profiles):
        compatible_profiles["sid_a"]["radius"] = None
        compatible_profiles["sid_b"]["radius"] = None
        assert are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_blocked_pair_not_compatible(self, compatible_profiles):
        blocks = {"hash_peer_a": {"hash_peer_b"}}
        assert not are_compatible("sid_a", "sid_b", compatible_profiles, blocks)

    def test_missing_profiles_always_compatible(self):
        assert are_compatible("ghost_a", "ghost_b", {}, {})


class TestFindCompatibleRoom:
    def test_returns_none_when_no_rooms(self):
        from app.services.matchmaking import find_compatible_room

        assert find_compatible_room("sid_a", {}, {}, {}) is None

    def test_returns_room_id_when_compatible_match_exists(self, compatible_profiles):
        from app.services.matchmaking import find_compatible_room

        rooms = {"room_1": {"users": ["sid_b"]}}
        result = find_compatible_room("sid_a", rooms, compatible_profiles, {})
        assert result == "room_1"

    def test_skips_incompatible_rooms(self, compatible_profiles):
        from app.services.matchmaking import find_compatible_room

        compatible_profiles["sid_b"]["targetGender"] = (
            "female"  # incompatible with sid_a (male)
        )
        rooms = {"room_1": {"users": ["sid_b"]}}
        assert find_compatible_room("sid_a", rooms, compatible_profiles, {}) is None


class TestLocationMatchRadius2:
    def test_location_outside_partner_radius_blocks_match(self, compatible_profiles):
        """Covers matchmaking.py L152: rad2 is the binding constraint."""
        # sid_a has no radius restriction; sid_b insists on 1km (too small)
        compatible_profiles["sid_a"]["radius"] = None
        compatible_profiles["sid_b"]["radius"] = 1  # ~1.5 km apart in fixture
        from app.services.matchmaking import are_compatible

        assert not are_compatible("sid_a", "sid_b", compatible_profiles, {})

    def test_skips_incompatible_rooms(self, compatible_profiles):
        from app.services.matchmaking import find_compatible_room

        compatible_profiles["sid_b"]["targetGender"] = (
            "female"  # incompatible with sid_a (male)
        )
        rooms = {"room_1": {"users": ["sid_b"]}}
        assert find_compatible_room("sid_a", rooms, compatible_profiles, {}) is None
