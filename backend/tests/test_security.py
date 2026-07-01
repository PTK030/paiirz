"""Unit tests for cryptographic hashing utilities."""

from app.security import hash_identifier


class TestHashIdentifier:
    def test_returns_64_char_hex_string(self):
        result = hash_identifier("192.168.1.1", "salt")
        assert isinstance(result, str)
        assert len(result) == 64

    def test_same_input_produces_same_hash(self):
        assert hash_identifier("1.2.3.4", "salt") == hash_identifier("1.2.3.4", "salt")

    def test_different_salts_produce_different_hashes(self):
        assert hash_identifier("1.2.3.4", "salt_a") != hash_identifier(
            "1.2.3.4", "salt_b"
        )

    def test_different_values_produce_different_hashes(self):
        assert hash_identifier("1.2.3.4", "salt") != hash_identifier("5.6.7.8", "salt")

    def test_none_value_returns_none(self):
        assert hash_identifier(None, "salt") is None

    def test_empty_string_returns_none(self):
        assert hash_identifier("", "salt") is None
