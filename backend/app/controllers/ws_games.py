"""Icebreaker mini-game event handlers.

Two game types are supported:
  - this_or_that:   both users vote on a binary question; answers are revealed
                    simultaneously to avoid anchoring bias.
  - truth_or_dare:  turn-based; the active player chooses truth/dare and
                    receives a random prompt.

Action dispatch uses a lookup table (_ACTION_HANDLERS) instead of a long
if/elif chain, making it easy to add new action types without touching
existing ones (Open/Closed principle).
"""

import logging
import random
import uuid
from typing import Callable

from flask import request
from flask_socketio import SocketIO, emit

from ..data.game_data import DARE_ACTIONS, THIS_OR_THAT, TRUTH_QUESTIONS
from ..data.state import rooms

logger = logging.getLogger(__name__)

_VALID_GAME_TYPES = {"this_or_that", "truth_or_dare"}


def register(sio: SocketIO) -> None:
    """Attach icebreaker handlers to the SocketIO instance."""
    sio.on_event("trigger_icebreaker", _on_trigger_icebreaker)
    sio.on_event("action_icebreaker", _on_action_icebreaker)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def _on_trigger_icebreaker(data: dict) -> None:
    room_id = data.get("room")
    game_type = data.get("type")
    sid = request.sid

    if not room_id or room_id not in rooms or game_type not in _VALID_GAME_TYPES:
        return

    users = rooms[room_id]["users"]
    msg_id = str(uuid.uuid4())
    game = _create_game(game_type, sid, users, data.get("customData"))
    rooms[room_id].setdefault("active_games", {})[msg_id] = game

    emit(
        "message",
        {
            "id": msg_id,
            "sid": "system",
            "reactions": {},
            "icebreaker": _serialize(game),
        },
        to=room_id,
    )


def _on_action_icebreaker(data: dict) -> None:
    room_id = data.get("room")
    msg_id = data.get("messageId")
    action_type = data.get("actionType", "vote")
    sid = request.sid

    if not room_id or room_id not in rooms or not msg_id:
        return

    game = rooms[room_id].get("active_games", {}).get(msg_id)
    if not game:
        return

    handler: Callable | None = _ACTION_HANDLERS.get(action_type)
    if handler:
        handler(game, sid, rooms[room_id]["users"], data)

    emit(
        "icebreaker_updated",
        {
            "messageId": msg_id,
            "icebreaker": _serialize(game),
        },
        to=room_id,
    )


# ---------------------------------------------------------------------------
# Game creation
# ---------------------------------------------------------------------------


def _create_game(
    game_type: str, sid: str, users: list, custom_data: dict | None
) -> dict:
    if game_type == "this_or_that":
        return _new_this_or_that(sid, custom_data)
    return _new_truth_or_dare(sid, users, custom_data)


def _new_this_or_that(sid: str, custom_data: dict | None) -> dict:
    if custom_data:
        question = custom_data.get("question", "To czy To?")
        options = custom_data.get("options", ["A", "B"])
    else:
        q = random.choice(THIS_OR_THAT)
        question, options = q["q"], q["opts"]

    return {
        "type": "this_or_that",
        "question": question,
        "options": options,
        "votes": {},
        "status": "proposed",
        "accepted_users": [sid],
        "round": 1,
        "ready_for_next": [],
    }


def _new_truth_or_dare(sid: str, users: list, custom_data: dict | None) -> dict:
    if custom_data:
        choice = custom_data.get("choice", "truth")
        partner_sid = next((u for u in users if u != sid), sid)
        return {
            "type": "truth_or_dare",
            "votes": {partner_sid: choice},
            "status": "proposed",
            "accepted_users": [sid],
            "round": 1,
            "turn_sid": partner_sid,
            "voter_sid": partner_sid,
            "question": "Prawda" if choice == "truth" else "Wyzwanie",
            "result": custom_data.get("text", ""),
            "ready_for_next": [],
            "is_custom": True,
        }

    turn_sid = random.choice(users) if users else sid
    return {
        "type": "truth_or_dare",
        "votes": {},
        "status": "proposed",
        "accepted_users": [sid],
        "round": 1,
        "turn_sid": turn_sid,
        "question": "Prawda czy Wyzwanie?",
        "options": ["Prawda 😇", "Wyzwanie 😈"],
        "ready_for_next": [],
    }


# ---------------------------------------------------------------------------
# Action handlers (one function per action type)
# ---------------------------------------------------------------------------


def _handle_accept(game: dict, sid: str, users: list, data: dict) -> None:
    if game["status"] != "proposed":
        return
    accepted = game.setdefault("accepted_users", [])
    if sid not in accepted:
        accepted.append(sid)
    if len(accepted) >= min(2, len(users)):
        game["status"] = "pending"


def _handle_decline(game: dict, sid: str, users: list, data: dict) -> None:
    if game["status"] == "proposed":
        game["status"] = "declined"


def _handle_quit(game: dict, sid: str, users: list, data: dict) -> None:
    game["status"] = "quit"


def _handle_vote(game: dict, sid: str, users: list, data: dict) -> None:
    if game["status"] != "pending":
        return
    action = data.get("action")

    if game["type"] == "this_or_that":
        if action not in [0, 1]:
            return
        game["votes"][sid] = action
        if len(game["votes"]) >= len(users):
            game["status"] = "revealed"

    elif game["type"] == "truth_or_dare":
        if sid != game.get("turn_sid") or action not in ("truth", "dare"):
            return
        pool = TRUTH_QUESTIONS if action == "truth" else DARE_ACTIONS
        game.update(
            {
                "status": "revealed",
                "question": "Prawda" if action == "truth" else "Wyzwanie",
                "result": random.choice(pool),
                "voter_sid": sid,
                "ready_for_next": [],
            }
        )
        game["votes"][sid] = action


def _handle_next_round(game: dict, sid: str, users: list, data: dict) -> None:
    if game["type"] != "this_or_that" or game["status"] != "revealed":
        return
    ready = game.setdefault("ready_for_next", [])
    if sid not in ready:
        ready.append(sid)
    if len(ready) >= min(2, len(users)):
        q = random.choice(THIS_OR_THAT)
        game.update(
            {
                "question": q["q"],
                "options": q["opts"],
                "votes": {},
                "status": "pending",
                "round": game.get("round", 1) + 1,
                "ready_for_next": [],
            }
        )


def _handle_complete_turn(game: dict, sid: str, users: list, data: dict) -> None:
    if game["type"] != "truth_or_dare" or game["status"] != "revealed":
        return
    voter_sid = game.get("voter_sid")
    ready = game.setdefault("ready_for_next", [])

    # The voter must initiate before the other player can confirm.
    if sid != voter_sid and voter_sid not in ready:
        return
    if sid not in ready:
        ready.append(sid)

    if len(ready) >= min(2, len(users)):
        partner_sid = next((u for u in users if u != voter_sid), voter_sid)
        game.update(
            {
                "turn_sid": partner_sid,
                "votes": {},
                "status": "pending",
                "round": game.get("round", 1) + 1,
                "question": "Prawda czy Wyzwanie?",
                "options": ["Prawda 😇", "Wyzwanie 😈"],
                "ready_for_next": [],
            }
        )
        game.pop("result", None)
        game.pop("voter_sid", None)


def _handle_skip_question(game: dict, sid: str, users: list, data: dict) -> None:
    if game["type"] != "truth_or_dare" or game["status"] != "revealed":
        return
    if sid != game.get("voter_sid"):
        return
    category = game["votes"].get(sid)
    if category not in ("truth", "dare"):
        return
    pool = TRUTH_QUESTIONS if category == "truth" else DARE_ACTIONS
    game["result"] = random.choice(pool)
    game["ready_for_next"] = []


def _handle_reject_turn(game: dict, sid: str, users: list, data: dict) -> None:
    if game["type"] != "truth_or_dare" or game["status"] != "revealed":
        return
    voter_sid = game.get("voter_sid")
    if sid == voter_sid:
        return
    ready = game.setdefault("ready_for_next", [])
    if voter_sid in ready:
        game["ready_for_next"] = []


# Lookup table - adding a new action type requires only a new function + entry here.
_ACTION_HANDLERS: dict[str, Callable] = {
    "accept": _handle_accept,
    "decline": _handle_decline,
    "quit": _handle_quit,
    "vote": _handle_vote,
    "next_round": _handle_next_round,
    "complete_turn": _handle_complete_turn,
    "skip_question": _handle_skip_question,
    "reject_turn": _handle_reject_turn,
}


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

_WIRE_FIELDS = (
    "type",
    "question",
    "options",
    "votes",
    "status",
    "accepted_users",
    "round",
    "turn_sid",
    "result",
    "voter_sid",
    "ready_for_next",
)


def _serialize(game: dict) -> dict:
    """Return only the fields the client needs, with None for missing ones."""
    return {field: game.get(field) for field in _WIRE_FIELDS}
