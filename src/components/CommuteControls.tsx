import { useState } from 'react'
import {
  Bus,
  Car,
  Clock,
  Navigation,
  Play,
  Square,
  AlertTriangle,
  MapPin,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { CommuterRole, RouteRecord } from '../types/routerelay'

interface CommuteControlsProps {
  activeRoute: RouteRecord
  role: CommuterRole
  onSelectRole: (role: CommuterRole) => void
  isSimulating: boolean
  onToggleSimulating: () => void
  simulationSpeed: number
  onChangeSimulationSpeed: (speed: number) => void
  simulatedProgress: number
  useGps: boolean
  onToggleGps: () => void
  gpsError: string | null
  connected: boolean
  peersCount: number
  onJumpToStop: (stopIndex: number) => void
  onOpenDropAlert: () => void
  activeAlertsCount?: number
}

export function CommuteControls({
  activeRoute,
  role,
  onSelectRole,
  isSimulating,
  onToggleSimulating,
  simulationSpeed,
  onChangeSimulationSpeed,
  simulatedProgress,
  useGps,
  onToggleGps,
  gpsError,
  connected,
  peersCount,
  onJumpToStop,
  onOpenDropAlert,
  activeAlertsCount = 0,
}: CommuteControlsProps) {
  const [showStopsDropdown, setShowStopsDropdown] = useState(false)

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 sm:p-4 text-xs space-y-3">
      {/* Top Row: Commuter Role Switcher + Room Presence Status + Report Hazard Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        {/* Role Selector */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onSelectRole('on_shuttle')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all ${
              role === 'on_shuttle'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Set role to Shuttle Rider"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>On Shuttle</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectRole('driver')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all ${
              role === 'driver'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Set role to Carpool Driver"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driver</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectRole('waiting')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all ${
              role === 'waiting'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Set role to Waiting at Stop"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waiting</span>
          </button>
        </div>

        {/* Action Center: Report Hazard Button & Presence Status Pill */}
        <div className="flex items-center gap-2">
          {/* Day 3: Report Hazard Quick Button */}
          <button
            type="button"
            onClick={onOpenDropAlert}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-amber-500/15 border border-amber-500/40 text-amber-500 hover:bg-amber-500/25 transition-all shadow-xs"
            title="Drop a time-decaying hazard pin along this corridor"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Report Hazard</span>
            {activeAlertsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-amber-950 text-[10px] font-bold">
                {activeAlertsCount}
              </span>
            )}
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              connected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span>
                  {peersCount + 1} Commuter{peersCount + 1 === 1 ? '' : 's'} Online
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Engine & Geolocation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Simulator Toggle & Speed */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleSimulating}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all shadow-xs ${
              isSimulating
                ? 'bg-purple-600 text-white hover:bg-purple-700 animate-pulse'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pause Commute</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Commute</span>
              </>
            )}
          </button>

          {/* Speed Preset Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border">
            {[30, 60, 90].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSimulationSpeed(spd)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                  simulationSpeed === spd
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {spd}k
              </button>
            ))}
          </div>

          {/* Jump to Stop Quick Action */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStopsDropdown((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors text-[11px]"
            >
              <MapPin className="w-3 h-3 text-sky-500" />
              <span>Jump Stop</span>
            </button>

            {showStopsDropdown && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
                <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground border-b border-border">
                  Select Corridor Stop
                </div>
                {activeRoute.stops.map((stop, idx) => (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => {
                      onJumpToStop(idx)
                      setShowStopsDropdown(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/80 text-foreground transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{stop.name}</span>
                    <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Real GPS Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleGps}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
              useGps
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle live device GPS coordinates"
          >
            <Navigation className={`w-3.5 h-3.5 ${useGps ? 'text-emerald-500' : ''}`} />
            <span>{useGps ? 'GPS Active' : 'Use Device GPS'}</span>
          </button>
          {gpsError && (
            <span className="text-[10px] text-amber-500 italic max-w-[120px] truncate" title={gpsError}>
              {gpsError}
            </span>
          )}
        </div>
      </div>

      {/* Corridor Progress Bar (visible when simulating) */}
      {isSimulating && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1 text-purple-400 font-semibold">
              <Sparkles className="w-3 h-3" />
              Simulated Transit Loop ({simulationSpeed} km/h)
            </span>
            <span>{Math.round(simulatedProgress)}% complete</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, simulatedProgress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
