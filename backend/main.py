from flask import Flask, Response, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random

app = Flask(__name__)
app.config["SECRET_KEY"] = "some fucking secret"
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

rooms = {} 

@app.route("/api/user/counter", methods=["GET"])
def index():
    user_count = sum(len(users) for users in rooms.values())
    return jsonify({"user_count": user_count})

@socketio.on('join')
def handle_connect():
    sid = request.sid
    print("Connected: ", sid)
    empty_rooms = [room for room, members in rooms.items() if len(members) < 2]
    if empty_rooms:
        room = random.choice(empty_rooms)
        rooms[room].append(sid)
        join_room(room)
        emit("room_joined", {"room": room, "sid": sid}, room=room)
    else:
        room = f"room_{len(rooms) + 1}"
        rooms[room] = [sid]
        join_room(room)
        emit("room_created", room)

@socketio.on('leave')
def handle_leave(data):
    room = data['room']
    leave_room(room)
    rooms.pop(room)
    emit("room_left", "somebody left", to=room)
    
@socketio.on('message')
def handle_message(data):
    room = data['room']
    message = data['message']
    emit("message", {"sid": request.sid, "message": message}, room=room)

@socketio.on('typing')
def handle_typing(data):
    room = data['room']
    typing = data['typing']
    emit("typing", {"sid": request.sid, "typing": typing}, room=room)

def update_room_users():
    for room, users in rooms.items():
        if len(users) == 1:
            emit("room_status", {"room": room, "can_send": False}, room=room)
        else:
            emit("room_status", {"room": room, "can_send": True}, room=room)


if __name__ == "__main__":
    socketio.run(app, debug=True)