import { Compass, MapPin, Navigation2 } from 'lucide-react'
import type { RouteRecord } from '../types/routerelay'

interface RouteSelectorProps {
  routes: RouteRecord[]
  activeRoute: RouteRecord
  onSelectRoute: (route: RouteRecord) => void
}

export function RouteSelector({ routes, activeRoute, onSelectRoute }: RouteSelectorProps) {
  return (
    <div className="bg-card border-b border-border px-4 py-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Corridor Picker */}
        <div className="flex items-center gap-3">
          <div
            className="w-3.5 h-3.5 rounded-full ring-2 ring-background shrink-0"
            style={{ backgroundColor: activeRoute.color }}
          />
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              <select
                value={activeRoute.id}
                onChange={(e) => {
                  const target = routes.find((r) => r.id === e.target.value)
                  if (target) onSelectRoute(target)
                }}
                className="bg-transparent font-bold text-sm sm:text-base text-foreground focus:outline-hidden cursor-pointer"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-background text-foreground">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{activeRoute.origin}</span>
              <span>→</span>
              <span>{activeRoute.destination}</span>
            </div>
          </div>
        </div>

        {/* Right: Corridor Metadata Pills */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 text-xs bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full border border-border">
            <MapPin className="w-3 h-3 text-sky-500" />
            <span>{activeRoute.stops.length} Stops</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full border border-border">
            <Navigation2 className="w-3 h-3 text-emerald-500" />
            <span>{activeRoute.waypoints.length} Waypoints</span>
          </div>
        </div>
      </div>
    </div>
  )
}
