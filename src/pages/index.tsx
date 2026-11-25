/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 * That makes it cheap to serve and safe for logged-out / crawler traffic.
 *
 * Need live data or auth here? Move this file to src/pages/(app)/index.tsx
 * and it becomes a dynamic page. Conversely, any page you want to keep static
 * (marketing, docs, legal) belongs at this top level.
 *
 * Top-level pages are also prerendered to static HTML at build
 * (prerender.ts, via vite.config.ts) so crawlers read real content.
 * Keep them renderable without a browser: no window/document during render,
 * prose in HTML text, reveal animations in CSS keyframes rather than JS-driven
 * initial states. `<Seo>` comes first and reads src/seo.ts.
 */

import { Link } from 'react-router-dom'
import { Map, MessageSquare, Navigation2, Radio, ShieldAlert } from 'lucide-react'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

const CORRIDORS = [
  'GT Road Express: Gujranwala ↔ UET KSK',
  'Lahore Express: Thokar / Shahdara ↔ UET KSK',
  'UET KSK: Campus & Hostels Loop',
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center text-foreground"
      >
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary">
            <Radio className="h-3.5 w-3.5" />
            <span>Real-Time Multiplayer Micro-Transit Tracker</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Coordinate every ride along your corridor with <span className="text-primary">{APP_NAME}</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Join a corridor room to share live ephemeral commuter pins, verify expiring road hazard
            alerts, and coordinate pickups with one-tap status updates — plus a built-in Commute
            Simulator to test live multiplayer tracking from anywhere.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
            >
              <Map className="h-4 w-4" />
              Launch Live Corridor Map
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              Explore App Overview
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {CORRIDORS.map((corridor) => (
              <span
                key={corridor}
                className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {corridor}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 pt-6 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <Navigation2 className="mb-2 h-5 w-5 text-sky-500" />
              <h2 className="text-sm font-semibold text-foreground">Live Presence & Simulator</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Throttled 3-second coordinates stay strictly in ephemeral presence and disappear
                automatically on disconnect.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <ShieldAlert className="mb-2 h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">TTL Hazard Pins</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Drop 30-minute traffic, checkpoint, or full-shuttle alerts with crowd verification
                (+15m confirm or 2-vote clear).
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <MessageSquare className="mb-2 h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">Route Channel & Quick Chips</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Per-corridor chat with one-tap status broadcasts that update both the feed and your
                live map pin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
