# RouteRelay — Real-Time Multiplayer Commuter & Micro-Transit Tracker

**Target Stack:** DeepSpace (`deepspace` + `deepspace/worker`), Cloudflare Workers & Durable Objects, Vite, React, TypeScript, Leaflet (`react-leaflet`)  
**Submission Window:** 5 Days  
**Inspired By:** DeepSpace examples **RunningMap** (live geospatial visualization) & **ThreadHunt** (community-verified, real-time ranked updates)

---

## 1. Problem Statement & Core Value Proposition

Daily commuters along fixed regional corridors—such as students and faculty traveling between **Gujranwala, Kala Shah Kaku (UET KSK), and Lahore**—lack reliable, real-time visibility into shuttle positions, carpool availability, and sudden road bottlenecks (checkpoint delays, traffic jams, full buses). Existing mapping apps show aggregate highway traffic, while group chats bury critical pickup updates in unstructured noise.

**RouteRelay** solves this with **corridor-scoped multiplayer rooms**:
1. **Live Ephemeral Telemetry:** Riders, drivers, and waiting commuters share live, throttled location pins along active routes that automatically disappear when they disconnect.
2. **Time-Decaying Hazard & Status Pins:** Commuters drop structured, expiring alerts (`Traffic Jam`, `Checkpoint`, `Shuttle Full`, `Roadblock`) with community verification (`Confirm +15m` / `Mark Cleared`).
3. **Zero-Friction Route Channel:** A lightweight, per-route live coordination feed with one-tap status chips (`"At Gate 1"`, `"Passing Muridke"`, `"2 Seats Free"`).
4. **Evaluator Commute Simulator:** A built-in **"Simulate Movement"** toggle that moves a virtual commuter along the route polyline, allowing any remote reviewer or teammate to test live multi-user map tracking immediately without physically traveling the route.

---

## 2. Scope & Intentional Cut-List (5-Day Guardrails)

To guarantee a polished, edge-case-tested full-stack application within five days, features are strictly divided into **In-Scope** and **Out-of-Scope** (documented as explicit engineering tradeoffs).

### In-Scope (MVP)
* **Pre-Seeded Corridor Rooms:** 3–4 realistic routes pre-loaded on startup so evaluators never land on an empty screen:
  1. *GT Road Express: Gujranwala ↔ UET KSK*
  2. *Lahore City Shuttle: Thokar / Shahdara ↔ UET KSK*
  3. *UET KSK Campus & Hostels Loop*
* **Authentication & Role Badges:** DeepSpace auth with user-selectable commuter role per session (`Waiting at Stop`, `On Shuttle`, `Carpool Driver`).
* **Real-Time Map & Presence:** Interactive OpenStreetMap / Leaflet canvas rendering route polylines, stops, live user markers, and real-time heading/status tooltips.
* **TTL Hazard Pins & Crowd Verification:** Click-to-drop map alerts with automatic expiration (`expiresAt`) and community voting to extend or clear alerts.
* **Route-Scoped Live Chat:** Real-time channel messaging tied to the active route room.
* **Demo Simulation Mode:** Client-side polyline interpolation mode so users on desktop browsers can simulate live GPS movement across tabs.

### Out-of-Scope (Intentional Tradeoffs)
* **Persistent GPS Breadcrumb History:** Only the latest coordinate per active user is kept in ephemeral presence state. Storing historical coordinate streams bloats SQLite, increases write contention, and creates unnecessary location-privacy risks.
* **Custom Turn-by-Turn Routing Engine:** Static GeoJSON/coordinate polylines are used instead of integrating external routing APIs (OSRM/Mapbox Directions), eliminating third-party rate limits and latency.
* **In-App Fare Splitting / Stripe:** Payments add boilerplate without improving the core real-time coordination loop.
* **Native Mobile Push Notifications:** Replaced by in-app visual/audio alert badges while a route room is open.

---

## 3. System Architecture & DeepSpace Integration Map

RouteRelay separates **high-frequency, transient state** from **low-frequency, durable state** to maximize responsiveness and minimize database churn on Cloudflare Durable Objects.

```
+-----------------------------------------------------------------------+
|                        React + Leaflet Client                         |
|  - Map Canvas (Polylines, Live Markers, Expiring Hazard Pins)         |
|  - GPS / Simulator Engine (Throttled 3s position emitter)             |
|  - Route Channel Drawer & Quick-Status Chips                          |
+-----------------------------------+-----------------------------------+
                                    | WebSocket / RPC (DeepSpace SDK)
                                    v
+-----------------------------------------------------------------------+
|             Cloudflare Worker + Durable Object (per Route)            |
|                                                                       |
|  1. Presence Layer (Ephemeral / In-Memory)                            |
|     - Active rider/driver coordinates, roles, lastHeartbeat           |
|     - Auto-evicts stale/disconnected clients                          |
|                                                                       |
|  2. Synced Collections (Durable SQLite)                               |
|     - `routes`: Corridor metadata, stops, polyline coordinates        |
|     - `alerts`: Typed hazard pins with `expiresAt` & vote counts      |
|                                                                       |
|  3. Channel Messaging                                                 |
|     - Real-time route chat & quick-status broadcasts                  |
+-----------------------------------------------------------------------+
```

### DeepSpace Primitives Used
| Primitive | Usage in RouteRelay | Why It Fits |
| :--- | :--- | :--- |
| **Auth** | User identity & display name on pins/messages | Prevents anonymous spam on community hazard pins and tracks unique voters. |
| **Presence / Room State** | Live commuter coordinates (`lat`, `lng`, `role`, `isSimulated`) | High-frequency updates (every 3s) stay ephemeral and clean up automatically on tab close/disconnect. |
| **Synced Collections** | `routes` and `alerts` tables | Guarantees durable, consistent map hazards across all connected clients with instant reactive updates. |
| **Channel Messaging** | Per-route coordination chat | Separates transient conversation from map state without custom WebSocket message routing. |

---

## 4. Data Models & Schema Design

### A. `routes` Collection (Durable / Seeded)
```ts
export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteRecord {
  id: string;                 // e.g., "gt-road-grw-ksk"
  name: string;               // e.g., "GT Road: Gujranwala ↔ UET KSK"
  origin: string;
  destination: string;
  color: string;              // Hex color for map polyline
  waypoints: [number, number][]; // Array of [lat, lng] coordinates
  stops: RouteStop[];
}
```

### B. `alerts` Collection (Durable with TTL Enforcement)
```ts
export type AlertType = "traffic" | "checkpoint" | "shuttle_full" | "roadblock";

export interface HazardAlert {
  id: string;
  routeId: string;
  type: AlertType;
  lat: number;
  lng: number;
  note: string;               // Max 120 chars
  createdBy: string;          // User ID
  createdByName: string;
  createdAt: number;          // Unix timestamp (ms)
  expiresAt: number;          // Unix timestamp (ms) - default createdAt + 30 mins
  confirmedBy: string[];      // User IDs who clicked "Still There" (+15m)
  clearedBy: string[];        // User IDs who clicked "Cleared" (auto-archives at >= 2)
}
```

### C. Ephemeral Presence Payload (In-Memory / Real-Time)
```ts
export type CommuterRole = "waiting" | "on_shuttle" | "driver";

export interface CommuterPresence {
  userId: string;
  displayName: string;
  routeId: string;
  role: CommuterRole;
  lat: number;
  lng: number;
  isSimulated: boolean;
  updatedAt: number;
}
```

---

## 5. Key Engineering Tradeoffs & Edge Cases

1. **Ephemeral Presence vs. SQLite Persistence for Coordinates:**
   * *Decision:* Keep live locations strictly in Presence; only write discrete hazard pins (`alerts`) to SQLite.
   * *Impact:* Eliminates hundreds of SQLite writes per minute per room and guarantees zero "ghost pins" when a commuter closes their browser.
2. **Client-Side + Server-Side TTL Filtering:**
   * *Decision:* Alerts carry an `expiresAt` timestamp. The UI filters out expired pins via a 10-second interval ticker, while backend mutations/queries prune expired rows.
   * *Impact:* Expired hazards vanish smoothly in real time without requiring heavy background cron infrastructure.
3. **Crowd-Sourced Decay & Archiving:**
   * *Decision:* Clicking **"Still There"** adds 15 minutes to `expiresAt` (capped at 60 minutes from now, 1 vote per user). Clicking **"Cleared"** by 2 unique users immediately expires the pin.
   * *Impact:* Prevents stale alerts from cluttering the corridor while resisting single-user griefing.
4. **Coordinate Throttling & Bounds Validation:**
   * *Decision:* Throttle outgoing presence updates to once every 3 seconds and clamp/validate `lat`/`lng` values on the worker.
   * *Impact:* Prevents WebSocket flooding on flaky mobile cellular connections along highways.

---

## 6. 5-Day Execution Roadmap

### Day 1: Environment Setup, Schema & Base Map
- [ ] Scaffold project in a clean directory: `npm create deepspace@latest routerelay`
- [ ] Load `github.com/deepdotspace/deepspace-skill` rules into Cursor.
- [ ] Install `leaflet`, `react-leaflet`, `@types/leaflet`, and `lucide-react`.
- [ ] Seed the 3 corridor routes (`Gujranwala ↔ UET KSK`, `Lahore ↔ UET KSK`, `Campus Loop`) with accurate coordinates.
- [ ] Build the split-screen responsive layout: Route selector header, full-height Leaflet map canvas, and collapsible side/bottom drawer.
- **Verification:** Map loads smoothly with colored route polylines and stop markers; switching routes pans/fits map bounds cleanly.

### Day 2: Auth, Live Presence & Commute Simulator
- [ ] Integrate DeepSpace authentication and role selector (`Waiting`, `On Shuttle`, `Driver`).
- [ ] Wire up `navigator.geolocation` with graceful fallback when location permission is denied.
- [ ] Build the **"Simulate Commute"** engine that interpolates position along the active route's `waypoints` array at realistic highway speeds.
- [ ] Broadcast throttled coordinates (every 3s) via DeepSpace Presence and render distinct live markers for all active users in the room.
- **Verification:** Open two browser windows (one normal, one incognito); enable "Simulate Commute" in Window A and verify smooth marker movement in Window B, plus instant removal when Window A closes.

### Day 3: Time-Decaying Hazard Pins & Community Voting
- [ ] Add "Drop Alert" mode (click anywhere on the map or snap to current user location) with a clean modal/popover for `AlertType` and a short note.
- [ ] Render custom color-coded hazard markers with countdown badges (e.g., `24m left`).
- [ ] Implement `"Still There (+15m)"` and `"Cleared"` actions with duplicate-vote prevention (`confirmedBy` / `clearedBy`).
- [ ] Add a 10-second client timer to auto-hide expired alerts.
- **Verification:** Drop an alert in Window A, confirm it appears immediately in Window B, test voting rules, and verify automatic expiration.

### Day 4: Route Channel, Quick-Status Chips & Hardening
- [ ] Integrate DeepSpace Channel Messaging scoped to the active `routeId`.
- [ ] Add one-tap commuter quick chips (`"At Main Gate"`, `"Leaving in 5m"`, `"2 Seats Available"`, `"Heavy Traffic Ahead"`).
- [ ] Audit edge cases: rapid route switching, mobile viewport drawer behavior, empty states, and network reconnects.
- **Verification:** Test full end-to-end flow on desktop and Chrome DevTools mobile emulation across multiple concurrent sessions.

### Day 5: Deployment & Submission Package
- [ ] Run production build check and deploy via `npx deepspace deploy` to `routerelay.app.space`.
- [ ] Smoke-test the live production URL across two devices/browsers.
- [ ] Clean up repository, ensure `README.md` documents setup and architecture, and prepare the submission note covering:
  - What was built & live URL
  - DeepSpace integrations used (Auth, Presence, Synced Collections, Channels)
  - Main architectural tradeoff (Ephemeral Presence vs. Durable SQLite + Simulator for evaluator testability)
  - Human vs. AI agent workflow (what Cursor generated vs. what was manually verified/refined)

---

## 7. Submission Note Template (Draft for Day 5)

> **Live URL:** `https://routerelay.app.space`  
> **Repository:** `<github-repo-url>`
>
> **What I Built:**  
> RouteRelay is a real-time multiplayer commuter and micro-transit coordination app built around fixed regional corridors (such as the Gujranwala–UET KSK–Lahore highway route). Commuters join a route room to share live positions, drop time-decaying hazard/checkpoint alerts verified by fellow riders, and coordinate pickups in a route-scoped channel. It also includes a built-in **Simulate Commute** mode so reviewers can test live multi-user telemetry without physically traveling the route.
>
> **DeepSpace Integrations Used:**  
> - **Presence / Room State:** Broadcasts throttled live commuter coordinates and roles (`Waiting`, `On Shuttle`, `Driver`), automatically cleaning up markers on disconnect.  
> - **Synced Collections:** Stores seeded corridor polylines (`routes`) and community-verified, TTL-expiring hazard pins (`alerts`).  
> - **Channel Messaging & Auth:** Powers authenticated, route-scoped live chat with one-tap status updates and vote deduplication.
>
> **Main Tradeoff:**  
> I intentionally kept live GPS/simulated coordinates strictly in ephemeral presence state rather than persisting trajectory histories to SQLite. Storing continuous location pings would add write contention and privacy overhead without helping commuters make immediate decisions. Similarly, I used pre-defined corridor polylines instead of a third-party turn-by-turn routing engine to keep latency low and focus engineering effort on real-time state synchronization and TTL decay rules.
>
> **Agent Workflow & Manual Verification:**  
> I configured Cursor with the `deepspace-skill` guidelines to scaffold the Leaflet map shell, TypeScript interfaces, and initial collection bindings. I manually designed the state split between ephemeral presence and durable TTL alerts, fixed edge cases around rapid route switching and coordinate throttling, and verified multi-client concurrency and disconnect cleanup across multiple browser sessions before deploying.