"""Shared pytest fixtures for all test modules."""

import pytest
from app import create_app
from app.config import Config


@pytest.fixture(scope="session")
def app():
    """Create a test application with deterministic config."""
    cfg = Config(
        SECRET_KEY="test-secret",
        IP_SALT="test-salt",
        CORS_ALLOWED_ORIGINS="*",
        FLASK_DEBUG=False,
        PORT=5000,
    )
    return create_app(cfg)


@pytest.fixture
def compatible_profiles() -> dict:
    """Two users that should match each other under all criteria."""
    return {
        "sid_a": {
            "peerId": "hash_peer_a",
            "ip": "hash_ip_a",
            "is_localhost": False,
            "gender": "male",
            "targetGender": "female",
            "age": 25,
            "ageMin": 18,
            "ageMax": 35,
            "lat": 52.2297,  # Warszawa
            "lon": 21.0122,
            "radius": 50,
        },
        "sid_b": {
            "peerId": "hash_peer_b",
            "ip": "hash_ip_b",
            "is_localhost": False,
            "gender": "female",
            "targetGender": "male",
            "age": 23,
            "ageMin": 18,
            "ageMax": 30,
            "lat": 52.2400,  # ~1.5 km from Warszawa
            "lon": 21.0200,
            "radius": 50,
        },
    }
