# RouteRelay — Real-Time Multiplayer Commuter & Micro-Transit Tracker

[![Stack: DeepSpace](https://img.shields.io/badge/Stack-DeepSpace%200.44-blue)](https://docs.deep.space)
[![Platform: Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers%20%26%20DOs-orange)](https://workers.cloudflare.com)
[![React: 19](https://img.shields.io/badge/React-19-cyan)](https://react.dev)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green)](https://leafletjs.com)

RouteRelay is a real-time multiplayer coordination platform for fixed regional corridors — such as commuters and students traveling between **Gujranwala, Kala Shah Kaku (UET KSK), and Lahore**.

- **Live Deployment:** [https://routerelay.app.space](https://routerelay.app.space)
- **Live Corridor Map:** [https://routerelay.app.space/map](https://routerelay.app.space/map)
- **Repository:** [https://github.com/burhanbutt385/route-relay](https://github.com/burhanbutt385/route-relay)

---

## 🌟 Key Features

1. **Corridor-Scoped Rooms:** Pre-seeded with realistic routes:
   - *GT Road Express: Gujranwala ↔ UET KSK*
   - *Lahore Express: Thokar / Shahdara ↔ UET KSK*
   - *UET KSK: Campus & Hostels Loop*
2. **Ephemeral Telemetry & Presence:** High-frequency, throttled (3s) location pins and commuter role badges (`Waiting`, `On Shuttle`, `Carpool Driver`) along active corridors that automatically disappear on disconnect (zero ghost markers).
3. **TTL Hazard & Checkpoint Pins:** Click-to-drop map alerts (`Traffic Jam`, `Checkpoint`, `Shuttle Full`, `Roadblock`) with a 30-minute default TTL, automatic 10-second expiration sweep, and crowd verification (`Still There +15m` capped at 60m / `Cleared` auto-archiving at 2 unique votes).
4. **Evaluator Commute Simulator:** Built-in virtual commuter engine that interpolates position and heading along corridor polylines with adjustable speed and stop jumps, allowing remote reviewers to test multi-user telemetry across browser tabs without physical travel.
5. **Route-Scoped Live Chat & Quick Chips:** Integrated per-corridor channel messaging with role-aware one-tap status chips (`"At Main Gate"`, `"Leaving in 5m"`, `"2 Seats Available"`, `"Heavy Traffic Ahead"`) that post to the feed and update your live map marker tooltip.

---

## 🏗️ Architecture & DeepSpace Primitives

RouteRelay deliberately splits **high-frequency ephemeral telemetry** from **low-frequency durable records** on Cloudflare Durable Objects:

| Primitive | Purpose in RouteRelay | Storage Strategy |
| :--- | :--- | :--- |
| **Presence (`AppPresenceRoom`)** | Live commuter coordinates, heading, role & status note | Ephemeral / In-Memory (`route:<routeId>`, auto-evicts on disconnect) |
| **Synced Collections (`AppRecordRoom`)** | `alerts` (TTL hazard pins + server-validated crowd votes) | Durable SQLite (hourly cron prunes expired rows; corridors are static in `src/data/corridors.ts`) |
| **Channel Messaging (`useChannels` / `useMessages`)** | Per-corridor coordination chat (`chat:<channelId>`) & quick-status broadcasts | Isolated per-channel Durable Object rooms |
| **Auth (`DeepSpaceAuthProvider`)** | Verified identity for vote deduplication & persistent chat (with guest preview fallback) | Verified JWTs via DeepSpace Auth |

### Key Engineering Tradeoffs

- **Ephemeral Presence vs. SQLite Persistence for Coordinates:** Live GPS/simulated positions stay strictly in Presence rather than writing breadcrumb trajectories to SQLite, eliminating write contention and location-privacy bloat while guaranteeing zero ghost pins on tab close.
- **Static Corridor Polylines vs. External Routing API:** Using seeded corridor waypoints removes third-party routing latency/rate limits so effort focuses on real-time multiplayer state sync and TTL decay rules.
- **Role-Safe Soft Archiving for Cleared Alerts:** Reaching 2 unique "Cleared" votes expires `expiresAt` via `update` rather than requiring admin-only `delete`, allowing any commuter to keep the corridor clean while resisting single-user griefing.

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

Visit `http://localhost:8780` (static landing) or `http://localhost:8780/map` (live corridor map). Open a second tab or incognito window and toggle **Simulate Commute** to see live multiplayer markers move in real time.

---

## 🧪 Testing, Build & Deployment

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Run unit tests (simulator, TTL alerts, route chat, static prerender)
npm run test:unit

# Production build check (client + SSR prerender + worker bundle)
npm run build

# Deploy to Cloudflare Workers via DeepSpace
npx deepspace deploy
```

---

## 📅 5-Day Execution Status

- [x] **Day 1:** Environment Setup, Schema Definitions, Leaflet Base Map, Corridor Polylines & Stops
- [x] **Day 2:** DeepSpace Auth, Commuter Roles, Ephemeral Presence Broadcasting & Commute Simulator
- [x] **Day 3:** Time-Decaying Hazard Pins, Map Drop Modal & Community Voting
- [x] **Day 4:** Route Channel Drawer, One-Tap Quick-Status Chips, Mobile Drawer & Multi-Session Hardening
- [x] **Day 5:** Production Build Verification, Live Deployment to `routerelay.app.space` & Submission Package
