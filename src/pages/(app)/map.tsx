import { useState } from 'react'
import { SEEDED_ROUTES, DEFAULT_ROUTE } from '../../data/corridors'
import type { RouteRecord } from '../../types/routerelay'
import { RouteSelector } from '../../components/RouteSelector'
import { MapCanvas } from '../../components/MapCanvas'
import { Info, Users, AlertTriangle } from 'lucide-react'

export default function MapPage() {
  const [activeRoute, setActiveRoute] = useState<RouteRecord>(DEFAULT_ROUTE)

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Route Selector Top Bar */}
      <RouteSelector
        routes={SEEDED_ROUTES}
        activeRoute={activeRoute}
        onSelectRoute={setActiveRoute}
      />

      {/* Main Workspace: Split-screen Map Canvas + Corridor Info Drawer */}
      <div className="flex-1 relative flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Full-bleed Leaflet Map */}
        <div className="flex-1 relative h-full w-full min-h-[350px]">
          <MapCanvas activeRoute={activeRoute} />
        </div>

        {/* Collapsible Corridor Details Sidebar */}
        <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card/50 backdrop-blur-xs flex flex-col shrink-0 max-h-[40vh] md:max-h-full overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              Corridor Overview
            </h2>
            <p className="text-base font-bold text-foreground mt-1">{activeRoute.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multiplayer transit coordination room
            </p>
          </div>

          {/* Corridor Stops Timeline */}
          <div className="p-4 flex-1">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Designated Stops ({activeRoute.stops.length})
            </h3>
            <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {activeRoute.stops.map((stop, idx) => (
                <div key={stop.id} className="relative flex items-start gap-3 pl-6">
                  <div
                    className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full border-2 border-background"
                    style={{ backgroundColor: activeRoute.color }}
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-medium text-foreground">{stop.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Stop #{idx + 1} • {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day 2 & Day 3 Preview Badges */}
          <div className="p-4 border-t border-border bg-muted/20 text-xs space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Day 2: Live commuter presence & simulator incoming</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Day 3: Ephemeral hazard pins & voting incoming</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
