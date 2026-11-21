# RouteRelay — Real-Time Multiplayer Commuter & Micro-Transit Tracker

[![Stack: DeepSpace](https://img.shields.io/badge/Stack-DeepSpace%200.44-blue)](https://docs.deep.space)
[![Platform: Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers%20%26%20DOs-orange)](https://workers.cloudflare.com)
[![React: 19](https://img.shields.io/badge/React-19-cyan)](https://react.dev)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green)](https://leafletjs.com)

RouteRelay is a real-time multiplayer coordination platform for fixed regional corridors — such as commuters and students traveling between **Gujranwala, Kala Shah Kaku (UET KSK), and Lahore**.

---

## 🌟 Key Features

1. **Corridor-Scoped Rooms:** Pre-seeded with realistic routes:
   - *GT Road Express: Gujranwala ↔ UET KSK*
   - *Lahore City Shuttle: Thokar / Shahdara ↔ UET KSK*
   - *UET KSK Campus & Hostels Loop*
2. **Ephemeral Telemetry & Presence:** High-frequency, throttled location pins along active corridors that automatically disappear on disconnect (zero ghost markers).
3. **TTL Hazard & Checkpoint Pins:** Click-to-drop map alerts (`Traffic Jam`, `Checkpoint`, `Shuttle Full`, `Roadblock`) with community verification (`Confirm +15m` / `Mark Cleared`).
4. **Evaluator Commute Simulator:** Built-in virtual commuter engine that moves along corridor polylines, allowing remote reviewers to test multi-user map tracking across tabs without physical travel.
5. **Route-Scoped Live Chat:** Integrated channel messaging with one-tap status chips (`"At Gate 1"`, `"Leaving in 5m"`, `"2 Seats Free"`).

---

## 🏗️ Architecture & DeepSpace Primitives

| Primitive | Purpose in RouteRelay | Storage Strategy |
| :--- | :--- | :--- |
| **Presence (`AppPresenceRoom`)** | Live commuter coordinates & roles | Ephemeral / In-Memory (evicts on tab close) |
| **Synced Collections (`AppRecordRoom`)** | `routes` (polylines) & `alerts` (hazard pins) | Durable SQLite across Durable Objects |
| **Channels / Messaging** | Route-scoped live coordination feed | Real-time WebSocket messaging |
| **Auth** | Commuter identity & vote deduplication | Verified JWTs via DeepSpace Auth |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 22`
- npm `>= 11`

### Installation & Local Run

```bash
# 1. Clone repository
git clone https://github.com/burhanbutt385/route-relay.git
cd route-relay

# 2. Install dependencies
npm install

# 3. Authenticate with DeepSpace
npx deepspace auth login

# 4. Start local development server
npm run dev
```

Visit `http://localhost:8780/map` in your browser.

---

## 🧪 Testing & Validation

```bash
# Type check
npm run type-check

# Run unit tests
npm run test:unit

# Production build check
npm run build
```

---

## 📅 5-Day Execution Status

- [x] **Day 1:** Environment Setup, Schema Definitions, Leaflet Base Map, Corridor Polylines & Stops
- [ ] **Day 2:** DeepSpace Auth, Commuter Roles, Ephemeral Presence Broadcasting & Commute Simulator
- [ ] **Day 3:** Time-Decaying Hazard Pins, Map Drop Modal & Community Voting
- [ ] **Day 4:** Route Channel Drawer, Quick-Status Chips & Multi-Session Hardening
- [ ] **Day 5:** Production Deployment to `routerelay.app.space` & Final Review Package
