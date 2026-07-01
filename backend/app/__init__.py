"""Flask application factory.

Using the factory pattern allows creating multiple isolated app instances -
critical for testing and future multi-tenant scenarios.
"""

from flask import Flask
from flask_cors import CORS

from .config import Config
from .controllers import api, register_ws_controllers
from .extensions import socketio


def create_app(config: Config | None = None) -> Flask:
    """Create, configure, and return the Flask application.

    Args:
        config: Optional Config instance. Reads from environment if omitted.

    Returns:
        A fully configured Flask application.
    """
    app = Flask(__name__)
    cfg = config or Config.from_env()
    app.config.from_object(cfg)

    CORS(app, resources={r"/*": {"origins": cfg.CORS_ALLOWED_ORIGINS}})
    socketio.init_app(
        app,
        cors_allowed_origins=cfg.CORS_ALLOWED_ORIGINS,
        max_http_buffer_size=50 * 1024 * 1024,
    )

    app.register_blueprint(api)
    register_ws_controllers(socketio)

    return app
