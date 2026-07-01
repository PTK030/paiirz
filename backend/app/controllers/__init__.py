"""Register all controllers (HTTP routes and SocketIO handlers) with the application."""

from flask_socketio import SocketIO

from . import ws_chat, ws_connection, ws_games, ws_private_rooms, ws_webrtc
from .http_routes import api


def register_ws_controllers(sio: SocketIO) -> None:
    """Attach all event namespaces to the given SocketIO instance."""
    ws_connection.register(sio)
    ws_chat.register(sio)
    ws_games.register(sio)
    ws_private_rooms.register(sio)
    ws_webrtc.register(sio)


__all__ = ["api", "register_ws_controllers"]
