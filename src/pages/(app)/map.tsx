import { useState } from 'react'
import { SEEDED_ROUTES, DEFAULT_ROUTE } from '../../data/corridors'
import type { RouteRecord } from '../../types/routerelay'
import { RouteSelector } from '../../components/RouteSelector'
import { MapCanvas } from '../../components/MapCanvas'
import { CommuterMarker } from '../../components/CommuterMarker'
import { CommuteControls } from '../../components/CommuteControls'
import { useCommuterPresence } from '../../hooks/useCommuterPresence'
import {
  Info,
  Users,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Bus,
  Car,
  Clock,
  Crosshair,
} from 'lucide-react'

export default function MapPage() {
  const [activeRoute, setActiveRoute] = useState<RouteRecord>(DEFAULT_ROUTE)
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'commuters' | 'stops'>('commuters')

  const {
    connected,
    myPresence,
    peers,
    setRole,
    isSimulating,
    toggleSimulating,
    simulationSpeed,
    setSimulationSpeed,
    simulatedProgress,
    useGps,
    toggleGps,
    gpsError,
    jumpToStop,
  } = useCommuterPresence(activeRoute)

  const allCommuters = [myPresence, ...peers]
  const shuttleCount = allCommuters.filter((c) => c.role === 'on_shuttle').length
  const driverCount = allCommuters.filter((c) => c.role === 'driver').length
  const waitingCount = allCommuters.filter((c) => c.role === 'waiting').length

  const handleLocateCommuter = (coords: [number, number]) => {
    setFocusCoords(null)
    setTimeout(() => {
      setFocusCoords([coords[0], coords[1]])
    }, 50)
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Route Selector Top Bar */}
      <RouteSelector
        routes={SEEDED_ROUTES}
        activeRoute={activeRoute}
        onSelectRoute={(route) => {
          setActiveRoute(route)
          setFocusCoords(null)
        }}
      />

      {/* Main Workspace: Split-screen Map Canvas + Corridor Info Drawer */}
      <div className="flex-1 relative flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Full-bleed Leaflet Map */}
        <div className="flex-1 relative h-full w-full min-h-[350px]">
          {/* Floating Commute Controls Bar */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:left-4 z-10 max-w-xl pointer-events-auto">
            <CommuteControls
              activeRoute={activeRoute}
              role={myPresence.role}
              onSelectRole={setRole}
              isSimulating={isSimulating}
              onToggleSimulating={toggleSimulating}
              simulationSpeed={simulationSpeed}
              onChangeSimulationSpeed={setSimulationSpeed}
              simulatedProgress={simulatedProgress}
              useGps={useGps}
              onToggleGps={toggleGps}
              gpsError={gpsError}
              connected={connected}
              peersCount={peers.length}
              onJumpToStop={jumpToStop}
            />
          </div>

          <MapCanvas activeRoute={activeRoute} focusCoords={focusCoords}>
            {/* Live Commuters (Ephemeral Presence) */}
            <CommuterMarker commuter={myPresence} isSelf={true} />
            {peers.map((peer) => (
              <CommuterMarker key={peer.userId} commuter={peer} isSelf={false} />
            ))}
          </MapCanvas>
        </div>

        {/* Collapsible Corridor Details Sidebar */}
        <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card/60 backdrop-blur-md flex flex-col shrink-0 max-h-[45vh] md:max-h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                Corridor Room
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                route:{activeRoute.id}
              </span>
            </div>
            <p className="text-base font-bold text-foreground mt-1 truncate">{activeRoute.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeRoute.origin} ↔ {activeRoute.destination}
            </p>

            {/* Quick Filter Counts */}
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-border/60 text-center">
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-md py-1 px-1.5">
                <div className="text-[10px] text-sky-400 font-medium flex items-center justify-center gap-1">
                  <Bus className="w-3 h-3" /> Shuttle
                </div>
                <div className="text-xs font-bold text-sky-300">{shuttleCount}</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md py-1 px-1.5">
                <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                  <Car className="w-3 h-3" /> Drivers
                </div>
                <div className="text-xs font-bold text-emerald-300">{driverCount}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md py-1 px-1.5">
                <div className="text-[10px] text-amber-400 font-medium flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Waiting
                </div>
                <div className="text-xs font-bold text-amber-300">{waitingCount}</div>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('commuters')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'commuters'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Active Commuters ({allCommuters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('stops')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'stops'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>Stops ({activeRoute.stops.length})</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeSidebarTab === 'commuters' ? (
              <div className="space-y-2">
                {/* Current User Card */}
                <div className="p-2.5 rounded-lg border border-sky-500/40 bg-sky-500/5 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        {myPresence.displayName}
                        <span className="text-[10px] text-sky-400 font-semibold">(You)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLocateCommuter([myPresence.lat, myPresence.lng])}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                      title="Locate on map"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span className="capitalize">{myPresence.role.replace('_', ' ')}</span>
                    <span className="font-mono text-[10px]">
                      {isSimulating ? `${Math.round(simulationSpeed)} km/h (SIM)` : 'Stationary'}
                    </span>
                  </div>
                </div>

                {/* Peer Commuters */}
                {peers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                    <p>No other commuters on this corridor yet.</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Open another tab or incognito window to test live multiplayer presence!
                    </p>
                  </div>
                ) : (
                  peers.map((peer) => (
                    <div
                      key={peer.userId}
                      className="p-2.5 rounded-lg border border-border bg-card/40 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-xs text-foreground">
                            {peer.displayName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLocateCommuter([peer.lat, peer.lng])}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Locate on map"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                        <span className="capitalize">{peer.role.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px]">
                          {peer.isSimulated
                            ? `${Math.round(peer.speedKmh || 0)} km/h (SIM)`
                            : 'Live GPS'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Corridor Stops Timeline */
              <div className="space-y-2 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {activeRoute.stops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className="relative flex items-center justify-between gap-3 pl-6 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className="absolute left-1 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-background"
                      style={{ backgroundColor: activeRoute.color }}
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-medium text-foreground">{stop.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Stop #{idx + 1}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLocateCommuter([stop.lat, stop.lng])}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Focus on stop"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5-Day Roadmap Status Footer */}
          <div className="p-3 border-t border-border bg-muted/20 text-xs space-y-1.5 shrink-0">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Day 1: Base Map, Corridors & Stops Complete</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Day 2: Live Presence & Simulator Complete</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Day 3: Decaying Hazard Pins & Community Voting Next</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
