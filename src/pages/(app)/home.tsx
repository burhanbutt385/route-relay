import { Link } from 'react-router-dom'
import { Map, Navigation2, ShieldAlert, Users } from 'lucide-react'
import { APP_NAME } from '../../constants'

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20">
          <Navigation2 className="w-3.5 h-3.5" />
          <span>Real-Time Multiplayer Micro-Transit Tracker</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Welcome to <span className="text-primary">{APP_NAME}</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Corridor-scoped live location pins, community-verified hazard alerts, and real-time
          commute coordination for the Gujranwala ↔ UET KSK ↔ Lahore transit lines.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-md transition-all"
          >
            <Map className="w-4 h-4" />
            Launch Live Corridor Map
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted/50 transition-all"
          >
            Open Commuter Chat
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left">
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <Users className="w-5 h-5 text-emerald-500 mb-2" />
            <div className="text-sm font-semibold">Live Presence</div>
            <div className="text-xs text-muted-foreground mt-1">
              Ephemeral GPS pins along active routes that vanish on disconnect.
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <ShieldAlert className="w-5 h-5 text-amber-500 mb-2" />
            <div className="text-sm font-semibold">TTL Hazard Pins</div>
            <div className="text-xs text-muted-foreground mt-1">
              Time-decaying road alerts with crowd confirmation and auto-expiry.
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <Navigation2 className="w-5 h-5 text-sky-500 mb-2" />
            <div className="text-sm font-semibold">Commute Simulator</div>
            <div className="text-xs text-muted-foreground mt-1">
              One-click virtual commuter engine to test live telemetry anywhere.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
