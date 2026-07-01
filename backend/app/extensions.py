"""Flask extension singletons.

Extensions are instantiated here without an app and bound later via init_app()
in create_app(). This pattern makes the app factory testable with multiple
isolated instances.
"""

from flask_socketio import SocketIO

socketio = SocketIO()
