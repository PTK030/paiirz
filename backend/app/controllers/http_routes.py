"""HTTP REST endpoints.

WebSocket communication is handled in app/events/. Only stateless HTTP
queries that don't require a persistent connection live here.
"""

from flask import Blueprint, jsonify, Response

from ..data.state import connected_users

api = Blueprint("api", __name__, url_prefix="/api")


@api.get("/users/count")
def user_count() -> Response:
    """Return the current number of connected WebSocket clients."""
    return jsonify({"user_count": len(connected_users)})
