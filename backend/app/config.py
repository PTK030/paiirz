"""Application configuration loaded from environment variables.

All configuration lives here. No os.getenv() calls are scattered across
the codebase - a single place to audit, change, and test settings.
"""

import os
import uuid
from dataclasses import dataclass


@dataclass
class Config:
    """Immutable snapshot of runtime configuration.

    Design note: IP_SALT is regenerated on every startup when not set via env.
    This is intentional - it prevents cross-restart correlation of hashed IPs,
    reinforcing the Zero-Knowledge privacy model without any storage overhead.
    """

    SECRET_KEY: str
    IP_SALT: str
    CORS_ALLOWED_ORIGINS: str | list[str]
    FLASK_DEBUG: bool = False
    PORT: int = 5000

    @classmethod
    def from_env(cls) -> "Config":
        """Build a Config from environment variables with safe defaults."""
        raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")
        origins: str | list[str] = (
            [o.strip() for o in raw_origins.split(",") if o.strip()]
            if raw_origins != "*"
            else "*"
        )

        return cls(
            SECRET_KEY=os.getenv("SECRET_KEY", "dev-secret-change-in-production"),
            IP_SALT=os.getenv("IP_SALT") or uuid.uuid4().hex,
            CORS_ALLOWED_ORIGINS=origins,
            FLASK_DEBUG=os.getenv("FLASK_DEBUG", "False").lower()
            in ("true", "1", "yes"),
            PORT=int(os.getenv("PORT", 5000)),
        )
