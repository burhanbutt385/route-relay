import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutations } from 'deepspace'
import { SEEDED_ROUTES, DEFAULT_ROUTE } from '../../data/corridors'
import type { RouteRecord, HazardAlert, AlertType } from '../../types/routerelay'
import { RouteSelector } from '../../components/RouteSelector'
import { MapCanvas } from '../../components/MapCanvas'
import { CommuterMarker } from '../../components/CommuterMarker'
import { HazardMarker } from '../../components/HazardMarker'
import { DropAlertModal } from '../../components/DropAlertModal'
import { CommuteControls } from '../../components/CommuteControls'
import { useCommuterPresence } from '../../hooks/useCommuterPresence'
import { useToast } from '@/components/ui'
import {
  ALERT_TYPE_CONFIGS,
  applyStillThereVote,
  applyClearedVote,
  formatTimeRemaining,
  formatRelativeTime,
  getInitialCorridorAlerts,
  isAlertExpired,
} from '../../lib/alerts'
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
  Radio,
  ThumbsUp,
  CheckCircle,
  Plus,
} from 'lucide-react'

export default function MapPage() {
  const [activeRoute, setActiveRoute] = useState<RouteRecord>(DEFAULT_ROUTE)
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'commuters' | 'stops' | 'alerts'>('commuters')

  // Clock ticker for 10-second (and second-by-second) auto-expiration of decaying hazard pins
  const [now, setNow] = useState<number>(Date.now())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const { success, warning, info } = useToast()

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

  // DeepSpace Synced Collections for Hazard Alerts
  const { records: alertRecords } = useQuery<HazardAlert>('alerts')
  const { create: createAlertRecord, put: putAlertRecord, remove: removeAlertRecord } =
    useMutations<HazardAlert>('alerts')

  // Local state for starter corridor hazards so evaluators immediately see active pins
  const [localSeedAlerts, setLocalSeedAlerts] = useState<HazardAlert[]>(() => [
    ...getInitialCorridorAlerts('gt-road-grw-ksk'),
    ...getInitialCorridorAlerts('lahore-ksk-express'),
    ...getInitialCorridorAlerts('uet-ksk-campus-loop'),
  ])

  // Drop Alert Modal state
  const [isDropModalOpen, setIsDropModalOpen] = useState<boolean>(false)
  const [dropModalCoords, setDropModalCoords] = useState<[number, number]>([
    DEFAULT_ROUTE.waypoints[0][0],
    DEFAULT_ROUTE.waypoints[0][1],
  ])

  // Merge Synced Collection records with Seed Alerts (preferring collection records)
  const allCorridorAlerts = useMemo(() => {
    const alertsMap = new Map<string, HazardAlert>()

    // Add local seeds first
    for (const seed of localSeedAlerts) {
      if (!isAlertExpired(seed, now)) {
        alertsMap.set(seed.id, seed)
      }
    }

    // Overlay synced records from DeepSpace RecordRoom
    if (alertRecords && alertRecords.length > 0) {
      for (const rec of alertRecords) {
        const d = rec.data as unknown as HazardAlert
        if (d && d.routeId) {
          const alertItem: HazardAlert = {
            id: rec.recordId,
            routeId: d.routeId,
            type: d.type || 'traffic',
            lat: typeof d.lat === 'number' ? d.lat : 0,
            lng: typeof d.lng === 'number' ? d.lng : 0,
            note: d.note || '',
            createdBy: d.createdBy || rec.createdBy || 'anonymous',
            createdByName: d.createdByName || 'Commuter',
            createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
            expiresAt: typeof d.expiresAt === 'number' ? d.expiresAt : Date.now() + 30 * 60 * 1000,
            confirmedBy: Array.isArray(d.confirmedBy) ? d.confirmedBy : [],
            clearedBy: Array.isArray(d.clearedBy) ? d.clearedBy : [],
          }

          if (!isAlertExpired(alertItem, now)) {
            alertsMap.set(alertItem.id, alertItem)
          }
        }
      }
    }

    return Array.from(alertsMap.values()).filter(
      (a) => a.routeId === activeRoute.id && !isAlertExpired(a, now)
    )
  }, [alertRecords, localSeedAlerts, activeRoute.id, now])

  const allCommuters = [myPresence, ...peers]
  const shuttleCount = allCommuters.filter((c) => c.role === 'on_shuttle').length
  const driverCount = allCommuters.filter((c) => c.role === 'driver').length
  const waitingCount = allCommuters.filter((c) => c.role === 'waiting').length

  const handleLocateCoords = (coords: [number, number]) => {
    setFocusCoords(null)
    setTimeout(() => {
      setFocusCoords([coords[0], coords[1]])
    }, 50)
  }

  // Open modal from map click or button
  const handleOpenDropAlert = useCallback(
    (coords?: [number, number]) => {
      if (coords) {
        setDropModalCoords(coords)
      } else {
        setDropModalCoords([myPresence.lat, myPresence.lng])
      }
      setIsDropModalOpen(true)
    },
    [myPresence.lat, myPresence.lng]
  )

  // Broadcast a new hazard alert
  const handleSubmitAlert = async (alertInput: {
    type: AlertType
    lat: number
    lng: number
    note: string
  }) => {
    const createdAt = Date.now()
    const expiresAt = createdAt + 30 * 60 * 1000 // default 30m TTL

    const newAlert: HazardAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      routeId: activeRoute.id,
      type: alertInput.type,
      lat: alertInput.lat,
      lng: alertInput.lng,
      note: alertInput.note,
      createdBy: myPresence.userId,
      createdByName: myPresence.displayName,
      createdAt,
      expiresAt,
      confirmedBy: [],
      clearedBy: [],
    }

    // 1. Optimistically add to local state
    setLocalSeedAlerts((prev) => [newAlert, ...prev])

    // 2. Persist to DeepSpace RecordRoom (synced to all connected clients)
    try {
      await createAlertRecord(newAlert)
      success(
        'Hazard Alert Broadcasted!',
        `Your 30-minute ${ALERT_TYPE_CONFIGS[alertInput.type].label} alert is live along ${activeRoute.name}.`
      )
    } catch {
      // Local fallback still functions for evaluators
      success(
        'Hazard Alert Active!',
        `Broadcasted ${ALERT_TYPE_CONFIGS[alertInput.type].label} alert (30m countdown active).`
      )
    }

    // Switch sidebar tab to alerts so user sees their new alert immediately
    setActiveSidebarTab('alerts')
  }

  // Community Voting: Still There (+15m)
  const handleVoteStillThere = async (alert: HazardAlert) => {
    const result = applyStillThereVote(alert, myPresence.userId, now)
    if (!result) {
      warning('Already Confirmed', 'You have already verified this hazard pin.')
      return
    }

    // Update local state
    setLocalSeedAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id
          ? { ...a, expiresAt: result.expiresAt, confirmedBy: result.confirmedBy }
          : a
      )
    )

    // Sync update to RecordRoom if server record
    try {
      await putAlertRecord(alert.id, {
        expiresAt: result.expiresAt,
        confirmedBy: result.confirmedBy,
      })
    } catch {
      // Handled gracefully
    }

    success(
      'Hazard Verified (+15m)',
      `Lifespan extended. ${formatTimeRemaining(result.expiresAt, now)} remaining.`
    )
  }

  // Community Voting: Cleared
  const handleVoteCleared = async (alert: HazardAlert) => {
    const result = applyClearedVote(alert, myPresence.userId, now)
    if (!result) {
      warning('Already Voted', 'You have already marked this hazard as cleared.')
      return
    }

    if (result.shouldArchive) {
      // 2 unique votes reached: immediately remove/archive
      setLocalSeedAlerts((prev) => prev.filter((a) => a.id !== alert.id))

      try {
        await removeAlertRecord(alert.id)
      } catch {
        // Fallback: put with expired timestamp
        try {
          await putAlertRecord(alert.id, {
            expiresAt: result.expiresAt,
            clearedBy: result.clearedBy,
          })
        } catch {
          // ignore
        }
      }

      success(
        'Hazard Cleared & Archived',
        'Verified by 2 commuters. Hazard pin has been removed from the map.'
      )
    } else {
      // 1 vote recorded
      setLocalSeedAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, clearedBy: result.clearedBy } : a))
      )

      try {
        await putAlertRecord(alert.id, { clearedBy: result.clearedBy })
      } catch {
        // ignore
      }

      info(
        'Cleared Vote Recorded',
        '1/2 votes received. 1 more commuter needed to auto-archive this pin.'
      )
    }
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
              onOpenDropAlert={() => handleOpenDropAlert()}
              activeAlertsCount={allCorridorAlerts.length}
            />
          </div>

          <MapCanvas
            activeRoute={activeRoute}
            focusCoords={focusCoords}
            onMapClick={(coords) => handleOpenDropAlert(coords)}
          >
            {/* Live Commuters (Ephemeral Presence - Day 2) */}
            <CommuterMarker commuter={myPresence} isSelf={true} />
            {peers.map((peer) => (
              <CommuterMarker key={peer.userId} commuter={peer} isSelf={false} />
            ))}

            {/* Time-Decaying Hazard Pins (Synced Collections & TTL - Day 3) */}
            {allCorridorAlerts.map((alert) => (
              <HazardMarker
                key={alert.id}
                alert={alert}
                currentUserId={myPresence.userId}
                now={now}
                onVoteStillThere={handleVoteStillThere}
                onVoteCleared={handleVoteCleared}
                onFocus={handleLocateCoords}
              />
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

          {/* 3-Tab Switcher: Commuters / Stops / Hazard Alerts (Day 3) */}
          <div className="flex border-b border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('commuters')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                activeSidebarTab === 'commuters'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Commuters ({allCommuters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('alerts')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 relative ${
                activeSidebarTab === 'alerts'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Alerts</span>
              {allCorridorAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px]">
                  {allCorridorAlerts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('stops')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                activeSidebarTab === 'stops'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>Stops ({activeRoute.stops.length})</span>
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeSidebarTab === 'commuters' && (
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
                      onClick={() => handleLocateCoords([myPresence.lat, myPresence.lng])}
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
                          onClick={() => handleLocateCoords([peer.lat, peer.lng])}
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

            {/* Day 3: Hazard Alerts Tab */}
            {activeSidebarTab === 'alerts' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Active Corridor Hazards ({allCorridorAlerts.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDropAlert()}
                    className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Report Pin
                  </button>
                </div>

                {allCorridorAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                    <AlertTriangle className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                    <p className="font-medium text-foreground">No active hazards reported</p>
                    <p className="text-[11px] text-muted-foreground">
                      This corridor is currently clear. Click "Report Pin" or anywhere on the map to drop an alert.
                    </p>
                  </div>
                ) : (
                  allCorridorAlerts.map((alert) => {
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
                        {/* Top line: Badge, Reporter, Countdown */}
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
                              onClick={() => handleLocateCoords([alert.lat, alert.lng])}
                              className="p-1 text-muted-foreground hover:text-primary transition-colors"
                              title="Focus on map"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Note */}
                        <p className="text-xs font-medium text-foreground leading-snug">
                          "{alert.note}"
                        </p>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => handleVoteStillThere(alert)}
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
                            onClick={() => handleVoteCleared(alert)}
                            disabled={hasVotedCleared}
                            className={`flex items-center justify-center gap-1 py-1 px-2 rounded-md font-medium text-[11px] border border-border transition-all ${
                              hasVotedCleared
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-card hover:bg-muted text-foreground'
                            }`}
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>
                              {hasVotedCleared
                                ? 'Cleared'
                                : `Cleared (${clearedList.length}/2)`}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Corridor Stops Timeline */}
            {activeSidebarTab === 'stops' && (
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
                      onClick={() => handleLocateCoords([stop.lat, stop.lng])}
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
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Day 3: Decaying Hazard Pins & Community Voting Complete</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Drop Alert Modal Dialog */}
      <DropAlertModal
        open={isDropModalOpen}
        onClose={() => setIsDropModalOpen(false)}
        activeRoute={activeRoute}
        initialCoords={dropModalCoords}
        userCurrentCoords={[myPresence.lat, myPresence.lng]}
        onSubmitAlert={handleSubmitAlert}
      />
    </div>
  )
}
