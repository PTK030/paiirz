"""Unit tests for application configuration loading."""

import os

import pytest
from app.config import Config


class TestConfig:
    def test_from_env_uses_defaults_when_env_is_empty(self, monkeypatch):
        monkeypatch.delenv("SECRET_KEY", raising=False)
        monkeypatch.delenv("IP_SALT", raising=False)
        monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
        monkeypatch.delenv("FLASK_DEBUG", raising=False)

        cfg = Config.from_env()

        assert cfg.SECRET_KEY == "dev-secret-change-in-production"
        assert len(cfg.IP_SALT) == 32  # uuid4().hex
        assert cfg.CORS_ALLOWED_ORIGINS == "*"
        assert cfg.FLASK_DEBUG is False

    def test_from_env_reads_secret_key(self, monkeypatch):
        monkeypatch.setenv("SECRET_KEY", "my-real-secret")
        cfg = Config.from_env()
        assert cfg.SECRET_KEY == "my-real-secret"

    def test_from_env_parses_comma_separated_origins(self, monkeypatch):
        monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://a.com, https://b.com")
        cfg = Config.from_env()
        assert cfg.CORS_ALLOWED_ORIGINS == ["https://a.com", "https://b.com"]

    def test_from_env_wildcard_origin_stays_as_string(self, monkeypatch):
        monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
        cfg = Config.from_env()
        assert cfg.CORS_ALLOWED_ORIGINS == "*"

    def test_from_env_debug_true_variants(self, monkeypatch):
        for value in ("true", "1", "yes"):
            monkeypatch.setenv("FLASK_DEBUG", value)
            assert Config.from_env().FLASK_DEBUG is True

    def test_from_env_generates_fresh_salt_when_not_set(self, monkeypatch):
        monkeypatch.delenv("IP_SALT", raising=False)
        s1 = Config.from_env().IP_SALT
        s2 = Config.from_env().IP_SALT
        # Each call generates a unique random salt
        assert s1 != s2
