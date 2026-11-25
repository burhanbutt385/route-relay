# RouteRelay — Project Write-Up

**Live App:** [https://routerelay.app.space](https://routerelay.app.space)  
**Live Corridor Map:** [https://routerelay.app.space/map](https://routerelay.app.space/map)  
**GitHub Repository:** [https://github.com/burhanbutt385/route-relay](https://github.com/burhanbutt385/route-relay)

---

## What I Built

**RouteRelay** is a real-time multiplayer commuter and micro-transit coordination web app built for fixed regional transit corridors — modeled around daily student and faculty commutes between **Gujranwala, Kala Shah Kaku (UET KSK), and Lahore**.

Existing mapping apps only show aggregate highway traffic, while commuter group chats bury critical pickup updates ("shuttle just crossed Muridke", "2 seats free", "police checkpoint ahead") in unstructured message noise. RouteRelay replaces that chaos with **corridor-scoped multiplayer rooms**:

1. **Pre-Seeded Corridor Rooms:** Ships with three ready-to-use corridors (*GT Road: Gujranwala ↔ UET KSK*, *Lahore Express: Thokar/Shahdara ↔ UET KSK*, and *UET KSK: Campus & Hostels Loop*) complete with polylines, stops, and starter hazard pins so reviewers never land on an empty map.
2. **Live Ephemeral Commuter Telemetry:** Commuters pick a session role (`Waiting at Stop`, `On Shuttle`, or `Carpool Driver`) and share throttled 3-second coordinates, heading arrows, speed, and live status notes directly on an interactive Leaflet map. Markers automatically vanish when a tab closes — zero ghost pins.
3. **Time-Decaying Hazard Pins & Crowd Verification:** Commuters click anywhere on the map (or snap to their position) to drop structured alerts (`Traffic Jam`, `Checkpoint`, `Shuttle Full`, `Roadblock`) with a 30-minute default TTL and a 10-second auto-expiry sweep. Fellow commuters can vote **"Still There (+15m)"** (capped at 60 minutes, 1 vote per user) or **"Cleared"** (2 unique commuters auto-archive the pin).
4. **Route-Scoped Live Feed & One-Tap Quick Chips:** Each corridor includes a dedicated chat tab with role-aware one-tap status chips (`"At Main Gate"`, `"Leaving in 5m"`, `"2 Seats Available"`, `"Heavy Traffic Ahead"`, `"Bus Full / Standing Only"`). Tapping a chip posts immediately to the corridor feed and updates the commuter's live tooltip on the map.
5. **Built-In Commute Simulator:** Because evaluators cannot physically drive the corridor to test live GPS sync, I built a client-side waypoint interpolation engine (**Simulate Commute**) with adjustable speed and stop jumps. Opening two browser tabs and toggling Simulate lets anyone verify live multiplayer movement and disconnect cleanup in seconds.
6. **Static Landing + Dynamic App Boundary:** The root landing page (`/`) is statically prerendered with zero auth or WebSocket connections, while `/map` and `/home` mount the real-time DeepSpace data plane.

---

## DeepSpace Primitives Used

RouteRelay intentionally separates **high-frequency ephemeral telemetry** from **low-frequency durable state** across Cloudflare Workers and Durable Objects:

| DeepSpace Primitive | How RouteRelay Uses It | Why It Fits |
| :--- | :--- | :--- |
| **Presence (`AppPresenceRoom` / `usePresenceRoom`)** | Broadcasts live coordinates, role, heading, speed, and status notes inside `route:<routeId>` rooms every 3 seconds. | Keeps continuous movement strictly in memory, avoiding SQLite write churn and guaranteeing instant cleanup when a commuter disconnects. |
| **Synced Collections (`AppRecordRoom` / `useQuery`, `useMutations`)** | Stores durable TTL-expiring `alerts` (`confirmedBy`, `clearedBy`, `expiresAt`) written through validated server actions and pruned hourly via cron. | Guarantees consistent, tamper-resistant hazard pins and server-merged crowd votes across all connected clients. |
| **Channel Messaging (`useChannels`, `useMessages`, `messagingSchemas`)** | Powers per-corridor live coordination channels isolated in `chat:<channelId>` rooms with deterministic oldest-channel resolution. | Gives each route its own real-time feed and SQLite room without piling chat into the main app room. |
| **Authentication (`DeepSpaceAuthProvider`, `useAuthUser`, `useUser`)** | Provides verified JWT commuter identity for vote deduplication and persistent channel writes, paired with an anonymous/guest preview mode (`allowAnonymous`). | Prevents anonymous spam on verified features while letting evaluators test the live map immediately with zero sign-up friction. |
| **Edge Build & Deploy (`deepspace/worker`, `npx deepspace deploy`)** | Bundles the Cloudflare Worker, 6 Durable Object namespaces, client assets, and static prerendered landing page to `routerelay.app.space`. | Single-command production deployment with edge and data-plane verification built in. |

### Key Architectural Tradeoffs

- **Ephemeral Presence over Persistent GPS History:** Live coordinates stay strictly in ephemeral Presence rather than persisting breadcrumb trails in SQLite, eliminating write contention and location-privacy bloat while guaranteeing automatic disconnect cleanup.
- **Seeded Corridor Polylines over External Routing APIs:** Pre-defined coordinate arrays avoid third-party routing latency and rate limits, keeping engineering focus on real-time sync and TTL decay mechanics.
- **Role-Safe Soft Archiving:** Reaching 2 "Cleared" votes expires `expiresAt` via `update` instead of requiring admin-only `delete`, allowing any two commuters to clear resolved hazards while resisting single-user griefing.

---

## Where the AI Agent Helped (and Where Human Direction Mattered)

### Where the Agent Helped

- **Scaffolding & UI Implementation:** Accelerated setup of the DeepSpace project layout, collection schemas (`routes`, `alerts`, messaging), TypeScript types, Leaflet custom markers (`CommuterMarker`, `HazardMarker`), modals (`DropAlertModal`), responsive mobile drawer, and the `RouteChatPanel`.
- **Geospatial & Domain Utilities + Unit Tests:** Drafted the haversine distance, forward bearing, and waypoint interpolation math for the Commute Simulator (`src/lib/simulator.ts`), TTL decay/voting helpers (`src/lib/alerts.ts`), quick-chip formatting (`src/lib/routeChat.ts`), and 25 Vitest unit tests covering those rules plus static SSR prerendering.
- **Integration Hardening & Release Automation:** Caught and fixed TypeScript/state mismatches left over between iterations, aligned starter alert corridor IDs with seeded routes, deduplicated optimistic vs. synced collection/channel writes, switched 2-vote archiving to role-safe TTL updates, updated the static landing page and SEO metadata, ran full `tsc` / `eslint` / `vitest` / `vite build` validation, deployed via `npx deepspace deploy`, and ran an automated two-browser (desktop + mobile) headless smoke test against the live production URL.

### Where Human Direction & Judgment Mattered

- **Problem Framing & Scope Guardrails:** Defining the real commuter workflow along the Gujranwala–UET KSK–Lahore corridors, choosing a tight 5-day roadmap, and establishing an explicit cut-list (no breadcrumb storage, no external routing API, no payments) to keep the product focused and shippable.
- **Core State Architecture:** Deciding which data belongs in ephemeral Presence vs. durable SQLite Collections and designing the built-in Commute Simulator specifically for zero-friction remote evaluation.
- **End-to-End Verification & Sign-Off:** Guiding day-by-day prioritization, verifying GitHub/DeepSpace account ownership, and reviewing the final production flow across routes, alerts, chat, and simulator modes.
