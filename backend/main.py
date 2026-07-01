"""Application entry point.

Loads environment variables, creates the Flask app, and starts the server.
For production, Gunicorn with the eventlet worker is used (see Dockerfile).
For local development: `python main.py`.
"""

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402 - must follow load_dotenv
from app.extensions import socketio  # noqa: E402

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, allow_unsafe_werkzeug=True)
