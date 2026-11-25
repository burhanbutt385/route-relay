import { useState } from 'react'
import type { CommuterPresence, HazardAlert, RouteRecord } from '../types/routerelay'
import { RouteChatPanel } from './RouteChatPanel'
import { ALERT_TYPE_CONFIGS, formatRelativeTime, formatTimeRemaining } from '../lib/alerts'
import {
  AlertTriangle,
  Bus,
  Car,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Info,
  MapPin,
  MessageSquare,
  Plus,
  Radio,
  ThumbsUp,
  Users,
} from 'lucide-react'

export type SidebarTab = 'commuters' | 'stops' | 'alerts' | 'chat'

interface CorridorSidebarProps {
  activeRoute: RouteRecord
  activeTab: SidebarTab
  onSelectTab: (tab: SidebarTab) => void
  connected: boolean
  myPresence: CommuterPresence
  peers: CommuterPresence[]
  isSimulating: boolean
  simulationSpeed: number
  alerts: HazardAlert[]
  now: number
  onLocateCoords: (coords: [number, number]) => void
  onOpenDropAlert: () => void
  onVoteStillThere: (alert: HazardAlert) => void
  onVoteCleared: (alert: HazardAlert) => void
  onBroadcastStatus: (statusText: string) => void
}

export function CorridorSidebar({
  activeRoute,
  activeTab,
  onSelectTab,
  connected,
  myPresence,
  peers,
  isSimulating,
  simulationSpeed,
  alerts,
  now,
  onLocateCoords,
  onOpenDropAlert,
  onVoteStillThere,
  onVoteCleared,
  onBroadcastStatus,
}: CorridorSidebarProps) {
  const [mobileDrawerHeight, setMobileDrawerHeight] = useState<'minimized' | 'normal' | 'expanded'>(
    'normal',
  )

  const allCommuters = [myPresence, ...peers]
  const shuttleCount = allCommuters.filter((c) => c.role === 'on_shuttle').length
  const driverCount = allCommuters.filter((c) => c.role === 'driver').length
  const waitingCount = allCommuters.filter((c) => c.role === 'waiting').length

  const mobileDrawerClasses =
    mobileDrawerHeight === 'minimized'
      ? 'h-14 md:h-full md:max-h-full'
      : mobileDrawerHeight === 'expanded'
        ? 'h-[85vh] max-h-[85vh] md:h-full md:max-h-full'
        : 'h-[48vh] max-h-[48vh] md:h-full md:max-h-full'

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card/60 backdrop-blur-md flex flex-col shrink-0 transition-[height] duration-200 overflow-hidden ${mobileDrawerClasses}`}
    >
      {/* Mobile Drawer Handle */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 shrink-0">
        <button
          type="button"
          onClick={() =>
            setMobileDrawerHeight((prev) =>
              prev === 'minimized' ? 'normal' : prev === 'normal' ? 'expanded' : 'minimized',
            )
          }
          className="flex items-center gap-2 text-xs font-semibold text-foreground"
        >
          <Radio className="w-3.5 h-3.5 text-primary" />
          <span className="truncate max-w-[180px]">{activeRoute.name.split(':')[0]}</span>
          <span className="text-[10px] text-muted-foreground">
            ({allCommuters.length} live · {alerts.length} alerts)
          </span>
        </button>
        <div className="flex items-center gap-1">
          {mobileDrawerHeight !== 'expanded' && (
            <button
              type="button"
              onClick={() =>
                setMobileDrawerHeight((prev) => (prev === 'minimized' ? 'normal' : 'expanded'))
              }
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Expand drawer"
              aria-label="Expand corridor drawer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {mobileDrawerHeight !== 'minimized' && (
            <button
              type="button"
              onClick={() =>
                setMobileDrawerHeight((prev) => (prev === 'expanded' ? 'normal' : 'minimized'))
              }
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Collapse drawer"
              aria-label="Collapse corridor drawer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div
        className={`p-4 border-b border-border shrink-0 ${mobileDrawerHeight === 'minimized' ? 'hidden md:block' : ''}`}
      >
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

      {/* 4-Tab Switcher: Commuters / Alerts / Chat / Stops */}
      <div
        className={`grid grid-cols-4 gap-1 border-b border-border bg-muted/40 p-1 shrink-0 ${mobileDrawerHeight === 'minimized' ? 'hidden md:grid' : ''}`}
      >
        <button
          type="button"
          onClick={() => onSelectTab('commuters')}
          className={`py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'commuters'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">Live ({allCommuters.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('alerts')}
          className={`py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1 relative ${
            activeTab === 'alerts'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate">Alerts</span>
          {alerts.length > 0 && (
            <span className="px-1 rounded-full bg-amber-500 text-amber-950 font-bold text-[9px]">
              {alerts.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className={`py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'chat'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">Chat</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('stops')}
          className={`py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'stops'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate">Stops</span>
        </button>
      </div>

      {/* Tab Body */}
      {activeTab === 'chat' ? (
        <div
          className={`flex-1 min-h-0 flex flex-col ${mobileDrawerHeight === 'minimized' ? 'hidden md:flex' : ''}`}
        >
          <RouteChatPanel
            activeRoute={activeRoute}
            myPresence={myPresence}
            peers={peers}
            now={now}
            onBroadcastStatus={onBroadcastStatus}
            className="flex-1 min-h-0"
          />
        </div>
      ) : (
        <div
          className={`flex-1 overflow-y-auto p-3 space-y-2 ${mobileDrawerHeight === 'minimized' ? 'hidden md:block' : ''}`}
        >
          {activeTab === 'commuters' && (
            <div className="space-y-2">
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
                    onClick={() => onLocateCoords([myPresence.lat, myPresence.lng])}
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
                        onClick={() => onLocateCoords([peer.lat, peer.lng])}
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
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Active Corridor Hazards ({alerts.length})
                </span>
                <button
                  type="button"
                  onClick={onOpenDropAlert}
                  className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Report Pin
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <AlertTriangle className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                  <p className="font-medium text-foreground">No active hazards reported</p>
                  <p className="text-[11px] text-muted-foreground">
                    This corridor is currently clear. Click &quot;Report Pin&quot; or anywhere on
                    the map to drop an alert.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const config = ALERT_TYPE_CONFIGS[alert.type] || ALERT_TYPE_CONFIGS.traffic
                  const timeRemaining = formatTimeRemaining(alert.expiresAt, now)
                  const relativeTime = formatRelativeTime(alert.createdAt, now)
                  const confirmedList = Array.isArray(alert.confirmedBy) ? alert.confirmedBy : []
                  const clearedList = Array.isArray(alert.clearedBy) ? alert.clearedBy : []
                  const hasVotedStillThere = confirmedList.includes(myPresence.userId)
                  const hasVotedCleared = clearedList.includes(myPresence.userId)

                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border ${config.borderClass} bg-card/50 hover:bg-muted/30 transition-all space-y-2.5`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${config.bgClass}`}
                          >
                            {config.label}
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {alert.createdByName} · {relativeTime}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            {timeRemaining}
                          </span>
                          <button
                            type="button"
                            onClick={() => onLocateCoords([alert.lat, alert.lng])}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            title="Focus on map"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-foreground leading-snug">
                        &quot;{alert.note}&quot;
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => onVoteStillThere(alert)}
                          disabled={hasVotedStillThere}
                          className={`flex items-center justify-center gap-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all ${
                            hasVotedStillThere
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>
                            {hasVotedStillThere
                              ? `Confirmed (${confirmedList.length})`
                              : `Still There (${confirmedList.length})`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onVoteCleared(alert)}
                          disabled={hasVotedCleared}
                          className={`flex items-center justify-center gap-1 py-1 px-2 rounded-md font-medium text-[11px] border border-border transition-all ${
                            hasVotedCleared
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-card hover:bg-muted text-foreground'
                          }`}
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>
                            {hasVotedCleared ? 'Cleared' : `Cleared (${clearedList.length}/2)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'stops' && (
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
                    onClick={() => onLocateCoords([stop.lat, stop.lng])}
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
      )}

      {/* Live Room Status Footer */}
      <div
        className={`px-3 py-2 border-t border-border bg-muted/20 text-[11px] flex items-center justify-between gap-2 shrink-0 ${mobileDrawerHeight === 'minimized' ? 'hidden md:flex' : ''}`}
      >
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <CheckCircle2
            className={`w-3.5 h-3.5 ${connected ? 'text-emerald-500' : 'text-amber-500'}`}
          />
          <span>{connected ? 'Presence & Sync Live' : 'Reconnecting Room…'}</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">TTL: 30m · 3s ping</span>
      </div>
    </aside>
  )
}
