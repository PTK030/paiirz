<img width="1280" height="731" alt="Zrzut ekranu 2026-07-02 234111" src="https://github.com/user-attachments/assets/0b35201a-2efc-41b0-b3a2-6384fe19e7fc" />
<div align="center">

# paiirz

**Connect. Chat. Disappear.**

An anonymous P2P chat with end-to-end encryption, WebRTC video/audio calls, and disappearing media — no registration, no history, no trace.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-5-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Tests](https://img.shields.io/badge/tests-300%2B_passing-brightgreen)](#testing)

</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Testing](#testing)
- [Security](#security)
- [License](#license)
- [Contact](#contact)

---

## About the Project

**paiirz** is an anonymous 1-on-1 messenger connecting two strangers (or friends via a private room code) using a peer-to-peer architecture. The server acts strictly as a "blind" signaling intermediary — it never has access to the conversation contents, encryption keys, or media.

No accounts, no message history after closing the tab, no content logging on the server — privacy is a fundamental design principle, not an afterthought.

## Features

- 🔒 **Full End-to-End Encryption (E2EE)** — ECDH (P-256) + HKDF + AES-GCM-256; the server never sees the content in plain text.
- 👻 **Disappearing Media** — "View once" photos, videos, and voice messages that disappear seconds after being opened.
- 🎯 **Advanced Matching Filters** — Filter by gender, age, and geographical radius (powered by Nominatim/OpenStreetMap).
- 📹 **P2P Video/Audio Calls** — Direct WebRTC connections with no intermediary media server.
- 🎮 **Icebreaker Games** — Built-in mini-games ("Truth or Dare", "This or That") to help break the ice.
- 🔑 **Private Rooms** — 6-character invitation code to chat with friends, bypassing random matchmaking.
- 🛡️ **Screenshot Protection** — Anti-screenshot measures and tab-leave notifications in private rooms.
- ⚡ **Rate Limiting & Zod Validation** — Every network event is treated as untrusted and validated against strict schemas before use.
- 🚀 **Route-Level Code Splitting** — Instant home page loading with the heavy chat module lazy-loaded on demand.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | [React 19](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) (strict) · [Vite](https://vitejs.dev/) · [Tailwind CSS 4](https://tailwindcss.com/) · [Framer Motion](https://www.framer.com/motion/) · [Zod](https://zod.dev/) |
| Backend | [Flask](https://flask.palletsprojects.com/) · [Flask-SocketIO](https://flask-socketio.readthedocs.io/) · [Eventlet](https://eventlet.readthedocs.io/) |
| Real-time / P2P | [Socket.IO](https://socket.io/) (signaling) · [WebRTC](https://webrtc.org/) (P2P media) |
| Cryptography | Web Crypto API — ECDH P-256, HKDF, AES-GCM-256 |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) (frontend) · [pytest](https://pytest.org/) (backend) |
| Code Quality | ESLint · Prettier · Black · Flake8 · Husky + lint-staged |

## Project Structure

```
paiirz/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── chat/          # Chat-specific components
│       │   │   ├── features/  # Settings panels, mode cards, search screen
│       │   │   ├── input/     # Input bar, location autocomplete
│       │   │   ├── layout/    # Chat header, wrappers, call banners
│       │   │   ├── media/     # Audio/video players, lightbox
│       │   │   └── messages/  # Message bubbles (React.memo)
│       │   └── ui/            # UI primitives shared across pages
│       ├── hooks/
│       │   ├── core/          # Room state, messages, sockets, stats
│       │   ├── media/         # E2EE, WebRTC, recording, media upload
│       │   ├── ui/            # Menus, notifications, autocomplete
│       │   └── utils/         # localStorage, user preferences
│       ├── pages/             # Route pages (lazy-loaded excluding Home)
│       ├── types/             # Types and Zod schemas for network data
│       ├── utils/             # Cryptography, validation, sounds
│       └── tests/             # Unit tests (hooks and utils)
└── backend/
    └── app/
        ├── controllers/       # HTTP routes and Socket.IO handlers
        ├── services/          # Matchmaking, rate limiting, room management
        ├── data/              # In-memory state and static game data
        └── utils/             # Geographical math, hashing utilities
```

## Installation and Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python main.py
```

The server will start at `http://localhost:5000` by default.

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

The application will start at `http://localhost:5173` by default.

## Testing

```bash
# Frontend
cd frontend
yarn test          # Vitest + code coverage
yarn type-check    # TypeScript
yarn lint          # ESLint

# Backend
cd backend
pytest -q
flake8 app
black --check app
```

## Security

- **End-to-End Encryption** — The content of text messages, photos, videos, and audio is encrypted in the browser before transmission; the server relays only ciphertexts.
- **Zod Validation** — Applied to every Socket.IO event received from the network. No external data is processed without prior schema validation.
- **Rate Limiting** — A sliding-window limiter strictly protects against message spam.
- **Hashed IP Addresses** — IP addresses are hashed with a random salt before being stored in process memory and are never logged in plain text.
- **Media Safelisting** — Images, videos, and audio are accepted exclusively as valid `data:` URIs matching the expected MIME types.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Questions and reports: Please use the contact form within the application (`/contact`).
