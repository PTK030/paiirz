"""Cryptographic utilities for Zero-Knowledge identifier hashing."""

import hashlib
from typing import Optional


def hash_identifier(value: Optional[str], salt: str) -> Optional[str]:
    """Return a salted SHA-256 hex digest of the given identifier.

    Raw IPs and peer IDs are NEVER stored anywhere - only their one-way hashes.
    Because the salt is re-generated on every server startup (when not set via
    env), hashes cannot be correlated across restarts even if they leak.

    Args:
        value: The raw identifier to hash (IP address, peer ID, etc.).
        salt:  The server-side secret salt from app config.

    Returns:
        A 64-character hex string, or None if value is falsy.
    """
    if not value:
        return None
    return hashlib.sha256(f"{value}:{salt}".encode()).hexdigest()
