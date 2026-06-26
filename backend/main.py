from flask import Flask, Response, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random
import os
import time
import uuid
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "some secret")

# Generate secure cryptographic salt for Zero-Knowledge IP and Peer ID hashing
IP_SALT = os.getenv("IP_SALT")
if not IP_SALT:
    IP_SALT = uuid.uuid4().hex

def hash_identifier(val):
    if not val:
        return None
    return hashlib.sha256(f"{val}:{IP_SALT}".encode("utf-8")).hexdigest()


cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")
if cors_origins != "*" and cors_origins:
    cors_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

socketio = SocketIO(app, cors_allowed_origins=cors_origins, max_http_buffer_size=50 * 1024 * 1024)
CORS(app, resources={r"/*": {"origins": cors_origins}})

rooms = {} 
connected_users = set()

# Anti-spam rate limiting state
message_timestamps = {}  # maps sid -> list of timestamps
blocked_users = {}       # maps sid -> blocked_until timestamp

import math

user_profiles = {}      # maps sid -> profile dictionary
persistent_blocks = {}  # maps ip or peer_id -> set of blocked ips/peer_ids

POLISH_CITIES = {
    "warszawa": (52.2297, 21.0122, "mazowieckie"),
    "krakow": (50.0647, 19.9450, "malopolskie"),
    "lodz": (51.7592, 19.4560, "lodzkie"),
    "wroclaw": (51.1079, 17.0385, "dolnoslaskie"),
    "poznan": (52.4069, 16.9299, "wielkopolskie"),
    "gdansk": (54.3520, 18.6466, "pomorskie"),
    "szczecin": (53.4285, 14.5528, "zachodniopomorskie"),
    "bydgoszcz": (53.1235, 18.0084, "kujawsko-pomorskie"),
    "lublin": (51.2465, 22.5684, "lubelskie"),
    "bialystok": (53.1325, 23.1688, "podlaskie"),
    "katowice": (50.2649, 19.0238, "slaskie"),
    "gdynia": (54.5189, 18.5305, "pomorskie"),
    "czestochowa": (50.7965, 19.1241, "slaskie"),
    "radom": (51.4027, 21.1471, "mazowieckie"),
    "sosnowiec": (50.2868, 19.1046, "slaskie"),
    "torun": (53.0138, 18.5984, "kujawsko-pomorskie"),
    "kielce": (50.8703, 20.6278, "swietokrzyskie"),
    "rzeszow": (50.0413, 21.9990, "podkarpackie"),
    "gliwice": (50.2941, 18.6714, "slaskie"),
    "zabrze": (50.3082, 18.7845, "slaskie"),
    "olsztyn": (53.7784, 20.4801, "warminsko-mazurskie"),
    "bielsko-biala": (49.8225, 19.0444, "slaskie"),
    "bytom": (50.3480, 18.9328, "slaskie"),
    "zielona gora": (51.9355, 15.5062, "lubuskie"),
    "rybnik": (50.0970, 18.5417, "slaskie"),
    "ruda slaska": (50.2599, 18.8576, "slaskie"),
    "opole": (50.6751, 17.9213, "opolskie"),
    "tychy": (50.1372, 18.9664, "slaskie"),
    "gorzow wielkopolski": (52.7368, 15.2288, "lubuskie"),
    "elblag": (54.1561, 19.4045, "warminsko-mazurskie"),
    "plock": (52.5463, 19.7065, "mazowieckie"),
    "walbrzych": (50.7719, 16.2842, "dolnoslaskie"),
    "wloclawek": (52.6484, 19.0678, "kujawsko-pomorskie"),
    "tarnow": (50.0138, 20.9869, "malopolskie"),
    "chorzow": (50.2976, 18.9548, "slaskie"),
    "koszalin": (54.1944, 16.1722, "zachodniopomorskie"),
    "kalisz": (51.7611, 18.0774, "wielkopolskie"),
    "legnica": (51.2070, 16.1558, "dolnoslaskie"),
    "grudziadz": (53.4841, 18.7537, "kujawsko-pomorskie"),
    "jaworzno": (50.2052, 19.2745, "slaskie")
}

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def is_blocked(sid1, sid2):
    p1 = user_profiles.get(sid1)
    p2 = user_profiles.get(sid2)
    if not p1 or not p2:
        return False

    # Use hashed (Zero-Knowledge) identifiers — raw IPs are never stored
    id1_peer = p1.get("peerId")
    id1_ip = p1.get("ip")
    id2_peer = p2.get("peerId")
    id2_ip = p2.get("ip")

    # Localhost exception — prevents self-blocking in dev environment
    if p1.get("is_localhost") and p2.get("is_localhost"):
        return False

    for identifier in [id1_peer, id1_ip]:
        if identifier and identifier in persistent_blocks:
            if id2_peer in persistent_blocks[identifier] or id2_ip in persistent_blocks[identifier]:
                return True

    for identifier in [id2_peer, id2_ip]:
        if identifier and identifier in persistent_blocks:
            if id1_peer in persistent_blocks[identifier] or id1_ip in persistent_blocks[identifier]:
                return True

    return False

def are_compatible(sid1, sid2):
    print(f"DEBUG: Checking compatibility between {sid1} and {sid2}")
    if is_blocked(sid1, sid2):
        print("DEBUG: blocked")
        return False
        
    p1 = user_profiles.get(sid1)
    p2 = user_profiles.get(sid2)
    if not p1 or not p2:
        print("DEBUG: missing profile")
        return True
        
    g1 = p1.get("gender", "any")
    tg1 = p1.get("targetGender", "any")
    g2 = p2.get("gender", "any")
    tg2 = p2.get("targetGender", "any")
    
    print(f"DEBUG: p1(gender={g1}, target={tg1}) vs p2(gender={g2}, target={tg2})")
    if tg1 != "any" and tg1 != g2:
        print("DEBUG: p1 target mismatch")
        return False
    if tg2 != "any" and tg2 != g1:
        print("DEBUG: p2 target mismatch")
        return False
    # --- Age range matching ---
    age1 = p1.get("age")
    age2 = p2.get("age")
    age_min1 = p1.get("ageMin")  # minimum age p1 is looking for
    age_max1 = p1.get("ageMax")  # maximum age p1 is looking for
    age_min2 = p2.get("ageMin")
    age_max2 = p2.get("ageMax")

    if age_min1 is not None and age2 is not None and age2 < age_min1:
        return False
    if age_max1 is not None and age2 is not None and age2 > age_max1:
        return False
    if age_min2 is not None and age1 is not None and age1 < age_min2:
        return False
    if age_max2 is not None and age1 is not None and age1 > age_max2:
        return False

    # --- Location matching (GPS-based via Browser Geolocation API) ---
    lat1 = p1.get("lat")
    lon1 = p1.get("lon")
    lat2 = p2.get("lat")
    lon2 = p2.get("lon")
    rad1 = p1.get("radius")
    rad2 = p2.get("radius")

    if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
        if rad1 is not None or rad2 is not None:
            dist = get_distance(lat1, lon1, lat2, lon2)
            if rad1 is not None and dist > rad1:
                return False
            if rad2 is not None and dist > rad2:
                return False

    return True


@app.route("/api/user/counter", methods=["GET"])
def index():
    return jsonify({"user_count": len(connected_users)})

@socketio.on('connect')
def handle_socket_connect():
    sid = request.sid
    connected_users.add(sid)
    print(f"Socket connected: {sid}. Total connected: {len(connected_users)}")
    emit("user_count", {"count": len(connected_users)}, broadcast=True)

@socketio.on('join')
def handle_connect(data=None):
    sid = request.sid
    raw_ip = request.remote_addr
    is_localhost = raw_ip in ("127.0.0.1", "::1", "localhost")

    # Zero-Knowledge: hash IP and Peer ID with server-side salt.
    # The raw IP is NEVER stored in memory — only the SHA-256 hash.
    hashed_ip = hash_identifier(raw_ip)
    raw_peer_id = data.get("peerId") if data else None
    hashed_peer_id = hash_identifier(raw_peer_id)

    # Parse profile / preferences
    def safe_int(val):
        try:
            return int(val) if val is not None and str(val).lstrip('-').isdigit() else None
        except (ValueError, TypeError):
            return None

    def safe_float(val):
        try:
            return float(val) if val is not None else None
        except (ValueError, TypeError):
            return None

    profile = {}
    if data:
        profile = {
            "peerId": hashed_peer_id,
            "ip": hashed_ip,
            "is_localhost": is_localhost,
            "gender": data.get("gender", "any"),
            "targetGender": data.get("targetGender", "any"),
            "age": safe_int(data.get("age")),
            "ageMin": safe_int(data.get("ageMin")),
            "ageMax": safe_int(data.get("ageMax")),
            "lat": safe_float(data.get("lat")),
            "lon": safe_float(data.get("lon")),
            "radius": safe_int(data.get("radius")),
        }
    else:
        profile = {
            "peerId": None,
            "ip": hashed_ip,
            "is_localhost": is_localhost,
            "gender": "any",
            "targetGender": "any",
            "age": None,
            "ageMin": None,
            "ageMax": None,
            "lat": None,
            "lon": None,
            "radius": None,
        }

    user_profiles[sid] = profile
    print(f"Joined queue: {sid} (localhost={is_localhost})")

    # Find compatible waiting room (where len(users) == 1)
    compatible_room = None
    for room, rdata in list(rooms.items()):
        if len(rdata["users"]) == 1:
            waiting_sid = rdata["users"][0]
            if are_compatible(sid, waiting_sid):
                compatible_room = room
                break

    if compatible_room:
        rooms[compatible_room]["users"].append(sid)
        rooms[compatible_room]["contacts"][sid] = None
        join_room(compatible_room)
        emit("room_joined", {"room": compatible_room, "sid": sid}, to=compatible_room)
    else:
        room = f"room_{len(rooms) + 1}"
        rooms[room] = {
            "users": [sid],
            "contacts": {sid: None},
            "active_games": {}
        }
        join_room(room)
        emit("room_created", room)

@socketio.on('leave')
def handle_leave(data):
    room = data.get('room')
    if room and room in rooms:
        leave_room(room)
        rooms.pop(room, None)
        emit("room_left", "somebody left", to=room)

@socketio.on('block_user')
def handle_block_user(data):
    room = data.get('room')
    sid = request.sid

    if not room or room not in rooms:
        return

    users = rooms[room]["users"]
    if sid not in users:
        return

    # Find partner sid
    partner_sid = None
    for u in users:
        if u != sid:
            partner_sid = u
            break

    if partner_sid:
        p_me = user_profiles.get(sid)
        p_partner = user_profiles.get(partner_sid)

        if p_me and p_partner:
            # All identifiers are already hashed (Zero-Knowledge) — safe to store in block list
            my_peer = p_me.get("peerId")
            my_ip = p_me.get("ip")
            partner_peer = p_partner.get("peerId")
            partner_ip = p_partner.get("ip")

            for my_id in [my_peer, my_ip]:
                if my_id:
                    blocked_set = persistent_blocks.setdefault(my_id, set())
                    if partner_peer:
                        blocked_set.add(partner_peer)
                    if partner_ip:
                        blocked_set.add(partner_ip)

    # Inform room and clear room
    emit("room_left", "blocked", to=room)
    rooms.pop(room, None)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    connected_users.discard(sid)
    user_profiles.pop(sid, None)
    print(f"Socket disconnected: {sid}. Total connected: {len(connected_users)}")
    emit("user_count", {"count": len(connected_users)}, broadcast=True)

    message_timestamps.pop(sid, None)
    blocked_users.pop(sid, None)

    room_to_remove = None
    for room, data in list(rooms.items()):
        if sid in data["users"]:
            room_to_remove = room
            break
    if room_to_remove:
        rooms.pop(room_to_remove, None)
        emit("room_left", "somebody left", to=room_to_remove)

@socketio.on('share_contact')
def handle_share_contact(data):
    room = data.get('room')
    contact = data.get('contact')
    sid = request.sid

    if room and room in rooms:
        if not contact or not isinstance(contact, str):
            return

        # Increase limit to 1000 chars to accommodate AES-GCM encrypted base64 payload
        contact = contact[:1000].strip()
        rooms[room]["contacts"][sid] = contact

        partner_sid = None
        for u in rooms[room]["users"]:
            if u != sid:
                partner_sid = u
                break

        if partner_sid:
            partner_contact = rooms[room]["contacts"].get(partner_sid)
            if partner_contact:
                emit("contact_exchanged", {"contact": partner_contact}, to=sid)
                emit("contact_exchanged", {"contact": contact}, to=partner_sid)
            else:
                emit("partner_wants_to_exchange", to=partner_sid)

@socketio.on('message')
def handle_message(data):
    sid = request.sid
    room = data.get('room')
    message = data.get('message')
    image = data.get('image')
    audio = data.get('audio')
    video = data.get('video')
    msg_id = data.get('id')

    vanishing = data.get('vanishing')
    view_once = data.get('viewOnce')
    # E2EE metadata: IV is passed alongside the encrypted ciphertext
    e2e = data.get('e2e')  # { iv: string } — tells receiver how to decrypt

    if not room or not (message or image or audio or video):
        return

    # Backend validation (Defense-in-depth)
    # Limits are slightly increased (~5%) to accommodate AES-GCM ciphertext + IV overhead
    if image and len(image) > 9 * 1024 * 1024:
        return
    if video and len(video) > 24 * 1024 * 1024:
        return

    now = time.time()

    # 1. Check if user is currently blocked
    blocked_until = blocked_users.get(sid, 0.0)
    if now < blocked_until:
        emit("rate_limit_warning", {
            "message": "Piszesz za szybko! Blokada antyspamowa.",
            "duration": int(max(1, round(blocked_until - now)))
        }, to=sid)
        return

    # 2. Check if user exceeded the rate limit (max 5 messages in 3 seconds)
    timestamps = message_timestamps.get(sid, [])
    timestamps = [t for t in timestamps if now - t <= 3.0]
    timestamps.append(now)
    message_timestamps[sid] = timestamps

    if len(timestamps) > 5:
        blocked_until = now + 5.0
        blocked_users[sid] = blocked_until
        emit("rate_limit_warning", {
            "message": "Piszesz za szybko! Blokada antyspamowa.",
            "duration": 5
        }, to=sid)
        return

    emit("message", {
        "id": msg_id,
        "sid": sid,
        "message": message,
        "image": image,
        "audio": audio,
        "video": video,
        "vanishing": vanishing,
        "viewOnce": view_once,
        "e2e": e2e,
        "reactions": {}
    }, to=room)

@socketio.on('message_reaction')
def handle_message_reaction(data):
    room = data.get('room')
    message_id = data.get('messageId')
    reaction = data.get('reaction')
    if room and message_id:
        emit("message_reaction", {
            "messageId": message_id,
            "sid": request.sid,
            "reaction": reaction
        }, to=room, include_self=False)

@socketio.on('typing')
def handle_typing(data):
    room = data['room']
    typing = data['typing']
    emit("typing", {"sid": request.sid, "typing": typing}, to=room, include_self=False)

@socketio.on('toggle_vanish')
def handle_toggle_vanish(data):
    room = data.get('room')
    active = data.get('active')
    if room:
        emit("vanish_toggled", {"sid": request.sid, "active": active}, to=room, include_self=False)

@socketio.on('screenshot_taken')
def handle_screenshot_taken(data):
    room = data.get('room')
    view_once = data.get('viewOnce', False)
    if room:
        emit("stranger_took_screenshot", {"sid": request.sid, "viewOnce": view_once}, to=room, include_self=False)

@socketio.on('view_once_consumed')
def handle_view_once_consumed(data):
    room = data.get('room')
    message_id = data.get('messageId')
    if room and message_id:
        emit("view_once_consumed", {"messageId": message_id, "sid": request.sid}, to=room, include_self=False)

@socketio.on('unsend_message')
def handle_unsend_message(data):
    room = data.get('room')
    message_id = data.get('messageId')
    if room and message_id:
        emit("message_unsent", {"messageId": message_id, "sid": request.sid}, to=room, include_self=False)

def update_room_users():
    for room, data in rooms.items():
        users = data["users"]
        if len(users) == 1:
            emit("room_status", {"room": room, "can_send": False}, to=room)
        else:
            emit("room_status", {"room": room, "can_send": True}, to=room)

# --- ICEBREAKER GAMES DATA & HANDLERS ---
THIS_OR_THAT_QUESTIONS = [
    {"q": "Kawa czy herbata?", "opts": ["Kawa ☕", "Herbata 🍵"]},
    {"q": "Mieszkać w domku w górach czy w apartamencie nad morzem?", "opts": ["Domek w górach ⛰️", "Apartament nad morzem 🌊"]},
    {"q": "Praca zdalna z Bali czy biuro w Nowym Jorku?", "opts": ["Bali 🏝️", "Nowy Jork 🏙️"]},
    {"q": "Zawsze spóźniać się 10 minut czy przychodzić 20 minut za wcześnie?", "opts": ["Spóźniać się 10m ⏰", "Przychodzić 20m wcześniej ⏱️"]},
    {"q": "Oglądać filmy w kinie czy na Netflixie pod kocem?", "opts": ["Kino 🎬", "Netflix pod kocem 🍿"]},
    {"q": "Podróżować w kosmos czy na samo dno oceanu?", "opts": ["Kosmos 🚀", "Dno oceanu 🌊"]},
    {"q": "Rozmawiać tylko szeptem czy tylko krzykiem?", "opts": ["Szeptem 🤫", "Krzykiem 📢"]},
    {"q": "Znać wszystkie języki świata czy umieć rozmawiać ze zwierzętami?", "opts": ["Języki świata 🗣️", "Rozmowa ze zwierzętami 🐾"]},
    {"q": "Płatność tylko kartą czy tylko gotówką?", "opts": ["Karta 💳", "Gotówka 💵"]},
    {"q": "Jeść pizzę z ananasem czy pizzę bez sera?", "opts": ["Z ananasem 🍍", "Bez sera 🧀"]}
]

TRUTH_QUESTIONS = [
    "Jaka jest Twoja najbardziej żenująca historia z dzieciństwa?",
    "Czego najbardziej żałujesz w życiu?",
    "Jaki jest Twój największy sekret, o którym nikt nie wie?",
    "Gdybyś mógł zamienić się z kimś życiem na jeden dzień, kto by to był?",
    "Jaka była najgorsza randka, na jakiej kiedykolwiek byłeś/aś?",
    "Czy kiedykolwiek okłamałeś/aś swojego najlepszego przyjaciela? O co chodziło?",
    "Jaki jest Twój najbardziej nietypowy nawyk?",
    "Czego najbardziej się boisz, czego inni mogą nie rozumieć?",
    "O czym myślałeś/aś wchodząc dzisiaj na tę aplikację?",
    "Gdybyś wygrał/a milion złotych, na co wydał(a)byś je w pierwszej kolejności?"
]

DARE_ACTIONS = [
    "Napisz krótki, śmieszny wierszyk o obcym na czacie.",
    "Wyślij obcemu wiadomość głosową trwającą dokładnie 7 sekund.",
    "Zmień temat rozmowy na teorię spiskową o kosmitach i broń jej przez 2 minuty.",
    "Opisz swój dzisiejszy dzień używając wyłącznie emoji.",
    "Przez kolejne 3 wiadomości na czacie dodawaj na końcu słowo 'miau'.",
    "Zadaj obcemu najtrudniejszą zagadkę, jaką znasz.",
    "Zrób zrzut ekranu tej rozmowy i powiedz obcemu dlaczego to zrobiłeś.",
    "Napisz zdanie wstecz: 'paiirz to najlepsza aplikacja czatowa'."
]

@socketio.on('trigger_icebreaker')
def handle_trigger_icebreaker(data):
    room = data.get('room')
    game_type = data.get('type')  # 'this_or_that' or 'truth_or_dare'
    custom_data = data.get('customData') # dict if custom game
    sid = request.sid
    
    if not room or room not in rooms or game_type not in ['this_or_that', 'truth_or_dare']:
        return

    msg_id = str(uuid.uuid4())
    rooms[room].setdefault("active_games", {})
    users = rooms[room]["users"]
    
    if game_type == 'this_or_that':
        if custom_data:
            question = custom_data.get("question", "To czy To?")
            options = custom_data.get("options", ["A", "B"])
        else:
            question_data = random.choice(THIS_OR_THAT_QUESTIONS)
            question = question_data["q"]
            options = question_data["opts"]
            
        rooms[room]["active_games"][msg_id] = {
            "type": "this_or_that",
            "question": question,
            "options": options,
            "votes": {},
            "status": "proposed",
            "accepted_users": [sid],
            "round": 1,
            "ready_for_next": []
        }
    else:  # truth_or_dare
        if custom_data:
            choice = custom_data.get("choice", "truth")
            text = custom_data.get("text", "")
            # Assign the turn to the partner so they get challenged!
            partner_sid = None
            for u in users:
                if u != sid:
                    partner_sid = u
                    break
            turn_sid = partner_sid if partner_sid else sid
            
            rooms[room]["active_games"][msg_id] = {
                "type": "truth_or_dare",
                "votes": {turn_sid: choice},
                "status": "proposed",
                "accepted_users": [sid],
                "round": 1,
                "turn_sid": turn_sid,
                "voter_sid": turn_sid,
                "question": "Prawda" if choice == "truth" else "Wyzwanie",
                "result": text,
                "ready_for_next": [],
                "is_custom": True
            }
        else:
            turn_sid = random.choice(users) if users else ""
            rooms[room]["active_games"][msg_id] = {
                "type": "truth_or_dare",
                "votes": {},
                "status": "proposed",
                "accepted_users": [sid],
                "round": 1,
                "turn_sid": turn_sid,
                "question": "Prawda czy Wyzwanie?",
                "options": ["Prawda 😇", "Wyzwanie 😈"],
                "ready_for_next": []
            }
        
    game_state = rooms[room]["active_games"][msg_id]
    emit("message", {
        "id": msg_id,
        "sid": "system",
        "reactions": {},
        "icebreaker": {
            "type": game_type,
            "question": game_state.get("question"),
            "options": game_state.get("options"),
            "votes": game_state.get("votes"),
            "status": game_state.get("status"),
            "accepted_users": game_state.get("accepted_users"),
            "round": game_state.get("round"),
            "turn_sid": game_state.get("turn_sid")
        }
    }, to=room)

@socketio.on('action_icebreaker')
def handle_action_icebreaker(data):
    room = data.get('room')
    msg_id = data.get('messageId')
    action = data.get('action')  # index 0/1 for this_or_that, or 'truth'/'dare' for truth_or_dare
    action_type = data.get('actionType', 'vote')  # 'vote', 'complete_turn', 'skip_question', 'next_round', 'accept', 'decline'
    sid = request.sid

    if not room or room not in rooms or not msg_id:
        return
        
    active_games = rooms[room].get("active_games", {})
    if msg_id not in active_games:
        return
        
    game = active_games[msg_id]
    users = rooms[room]["users"]

    # 0. Accept / Decline Invitation
    if action_type == 'accept':
        if game["status"] != "proposed":
            return
        accepted = game.setdefault("accepted_users", [])
        if sid not in accepted:
            accepted.append(sid)
            
        if len(accepted) >= 2 or len(accepted) >= len(users):
            game["status"] = "pending"
            
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "question": game["question"],
                "options": game.get("options"),
                "votes": game["votes"],
                "status": game["status"],
                "accepted_users": game["accepted_users"],
                "round": game.get("round", 1),
                "turn_sid": game.get("turn_sid")
            }
        }, to=room)
        return

    elif action_type == 'decline':
        if game["status"] != "proposed":
            return
        game["status"] = "declined"
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "question": game["question"],
                "status": game["status"],
                "round": game.get("round", 1)
            }
        }, to=room)
        return

    elif action_type == 'quit':
        game["status"] = "quit"
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "status": game["status"],
                "round": game.get("round", 1)
            }
        }, to=room)
        return

    # 1. Vote / Choice Action
    if action_type == 'vote':
        if game["status"] != "pending":
            return

        if game["type"] == "this_or_that":
            if action not in [0, 1]:
                return
            
            game["votes"][sid] = action
            if len(game["votes"]) >= len(users):
                game["status"] = "revealed"
                
            emit("icebreaker_updated", {
                "messageId": msg_id,
                "icebreaker": {
                    "type": game["type"],
                    "question": game["question"],
                    "options": game["options"],
                    "votes": game["votes"],
                    "status": game["status"],
                    "round": game.get("round", 1)
                }
            }, to=room)
            
        elif game["type"] == "truth_or_dare":
            # Only the player whose turn it is can choose
            if sid != game.get("turn_sid"):
                return
            if action not in ["truth", "dare"]:
                return
                
            text = ""
            if action == "truth":
                text = random.choice(TRUTH_QUESTIONS)
            else:
                text = random.choice(DARE_ACTIONS)
                
            game["status"] = "revealed"
            game["votes"][sid] = action
            game["question"] = "Prawda" if action == "truth" else "Wyzwanie"
            game["result"] = text
            game["voter_sid"] = sid
            game["ready_for_next"] = []
            
            emit("icebreaker_updated", {
                "messageId": msg_id,
                "icebreaker": {
                    "type": game["type"],
                    "question": game["question"],
                    "votes": game["votes"],
                    "status": game["status"],
                    "result": text,
                    "voter_sid": sid,
                    "round": game.get("round", 1),
                    "turn_sid": game.get("turn_sid"),
                    "ready_for_next": []
                }
            }, to=room)

    # 2. Next Round Action for This or That
    elif action_type == 'next_round':
        if game["type"] != "this_or_that" or game["status"] != "revealed":
            return
            
        ready = game.setdefault("ready_for_next", [])
        if sid not in ready:
            ready.append(sid)
            
        if len(ready) >= 2 or len(ready) >= len(users):
            game["ready_for_next"] = []
            # Draw a new question
            question_data = random.choice(THIS_OR_THAT_QUESTIONS)
            game["question"] = question_data["q"]
            game["options"] = question_data["opts"]
            game["votes"] = {}
            game["status"] = "pending"
            game["round"] = game.get("round", 1) + 1
            
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "question": game["question"],
                "options": game["options"],
                "votes": game["votes"],
                "status": game["status"],
                "round": game.get("round", 1),
                "ready_for_next": game.get("ready_for_next", [])
            }
        }, to=room)

    # 3. Complete Turn Action for Truth or Dare (switches turn)
    elif action_type == 'complete_turn':
        if game["type"] != "truth_or_dare" or game["status"] != "revealed":
            return
            
        ready = game.setdefault("ready_for_next", [])
        
        # Voter must initiate complete_turn first
        voter_sid = game.get("voter_sid")
        if sid != voter_sid and voter_sid not in ready:
            return
            
        if sid not in ready:
            ready.append(sid)
            
        if len(ready) >= 2 or len(ready) >= len(users):
            game["ready_for_next"] = []
            # Find partner SID to pass the turn
            partner_sid = None
            for u in users:
                if u != voter_sid:
                    partner_sid = u
                    break
            
            # Switch turn
            game["turn_sid"] = partner_sid if partner_sid else voter_sid
            game["votes"] = {}
            game["status"] = "pending"
            game["round"] = game.get("round", 1) + 1
            game["question"] = "Prawda czy Wyzwanie?"
            game["options"] = ["Prawda 😇", "Wyzwanie 😈"]
            game.pop("result", None)
            game.pop("voter_sid", None)
            
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "question": game["question"],
                "options": game.get("options"),
                "votes": game["votes"],
                "status": game["status"],
                "result": game.get("result"),
                "voter_sid": game.get("voter_sid"),
                "round": game.get("round", 1),
                "turn_sid": game.get("turn_sid"),
                "ready_for_next": game.get("ready_for_next", [])
            }
        }, to=room)

    # 4. Skip / Redraw Question Action for Truth or Dare
    elif action_type == 'skip_question':
        if game["type"] != "truth_or_dare" or game["status"] != "revealed":
            return
            
        # Only active voter can skip
        if sid != game.get("voter_sid"):
            return
            
        # Determine current category
        category = game["votes"].get(sid)
        text = ""
        if category == "truth":
            text = random.choice(TRUTH_QUESTIONS)
        elif category == "dare":
            text = random.choice(DARE_ACTIONS)
        else:
            return
            
        game["result"] = text
        game["ready_for_next"] = []
        
        emit("icebreaker_updated", {
            "messageId": msg_id,
            "icebreaker": {
                "type": game["type"],
                "question": game["question"],
                "votes": game["votes"],
                "status": game["status"],
                "result": text,
                "voter_sid": sid,
                "round": game.get("round", 1),
                "turn_sid": game.get("turn_sid"),
                "ready_for_next": []
            }
        }, to=room)


# --- Private Room Handlers ---

@socketio.on('create_private_room')
def handle_create_private_room(data):
    """Create an invite-only private room with a 6-character code."""
    sid = request.sid
    room_code = data.get('roomCode', '')
    no_screenshots = data.get('noScreenshots', False)
    notify_on_tab_leave = data.get('notifyOnTabLeave', False)

    if not room_code or len(room_code) != 6:
        emit('private_room_error', {'message': 'Nieprawidłowy kod pokoju.'}, to=sid)
        return

    room_id = f"private_{room_code}"
    if room_id in rooms:
        emit('private_room_error', {'message': 'Pokój z tym kodem już istnieje. Spróbuj ponownie.'}, to=sid)
        return

    rooms[room_id] = {
        "users": [sid],
        "contacts": {sid: None},
        "active_games": {},
        "is_private": True,
        "owner_sid": sid,
        "no_screenshots": bool(no_screenshots),
        "notify_on_tab_leave": bool(notify_on_tab_leave)
    }
    join_room(room_id)
    emit('private_room_created', {'room': room_id, 'code': room_code}, to=sid)
    print(f"Private room created: {room_id} by {sid}")


@socketio.on('join_private_room')
def handle_join_private_room(data):
    """Join an existing private room using its 6-character code."""
    sid = request.sid
    room_code = data.get('roomCode', '')

    if not room_code:
        emit('private_room_error', {'message': 'Brakuje kodu pokoju.'}, to=sid)
        return

    room_id = f"private_{room_code}"
    if room_id not in rooms:
        emit('private_room_error', {'message': 'Pokój nie istnieje lub wygasł.'}, to=sid)
        return

    room_data = rooms[room_id]
    if len(room_data['users']) >= 2:
        emit('private_room_error', {'message': 'Pokój jest pełny. Tylko 2 osoby mogą dołączyć.'}, to=sid)
        return

    if sid in room_data['users']:
        emit('private_room_error', {'message': 'Już jesteś w tym pokoju.'}, to=sid)
        return

    room_data['users'].append(sid)
    room_data['contacts'][sid] = None
    join_room(room_id)
    emit('room_joined', {'room': room_id, 'sid': sid}, to=room_id)
    print(f"User {sid} joined private room: {room_id}")


@socketio.on('tab_visibility_change')
def handle_tab_visibility_change(data):
    """Notify partner when user switches tabs (only if room has flag enabled)."""
    room = data.get('room')
    hidden = data.get('hidden', False)

    if not room or room not in rooms:
        return

    room_data = rooms[room]
    if room_data.get('notify_on_tab_leave'):
        emit('partner_tab_hidden', {'hidden': hidden}, to=room, include_self=False)


# --- E2EE Key Exchange Relay ---
# The server is a blind relay: it only forwards ECDH public keys between peers.
# It never has access to the derived shared secret or any plaintext.
@socketio.on('e2e_key_exchange')
def handle_e2e_key_exchange(data):
    room = data.get('room')
    public_key = data.get('publicKey')
    if room and room in rooms and public_key and isinstance(public_key, str):
        # Validate key length: base64-encoded P-256 raw public key is 88 chars
        if len(public_key) > 200:
            return
        emit('e2e_key_exchange', {
            'sender_sid': request.sid,
            'publicKey': public_key
        }, to=room, include_self=False)


# --- WebRTC Signaling Relay ---
# The server only forwards signaling packets (SDP offer/answer, ICE candidates)
# between the two peers in a room. All actual media travels directly P2P.
@socketio.on('webrtc_signal')
def handle_webrtc_signal(data):
    room = data.get('room')
    if room and room in rooms:
        emit('webrtc_signal', {
            'sender_sid': request.sid,
            'signal': data.get('signal')
        }, to=room, include_self=False)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    socketio.run(app, host="0.0.0.0", port=port, debug=debug_mode, allow_unsafe_werkzeug=True)