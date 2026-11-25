import { useState, useEffect, useCallback } from 'react'
import { SEEDED_ROUTES, DEFAULT_ROUTE } from '../../data/corridors'
import type { AlertType, RouteRecord } from '../../types/routerelay'
import { RouteSelector } from '../../components/RouteSelector'
import { MapCanvas, type FocusTarget } from '../../components/MapCanvas'
import { CommuterMarker } from '../../components/CommuterMarker'
import { HazardMarker } from '../../components/HazardMarker'
import { DropAlertModal } from '../../components/DropAlertModal'
import { CommuteControls } from '../../components/CommuteControls'
import { CorridorSidebar, type SidebarTab } from '../../components/CorridorSidebar'
import { useCommuterPresence } from '../../hooks/useCommuterPresence'
import { useCorridorAlerts } from '../../hooks/useCorridorAlerts'
import { useToast } from '@/components/ui'

export default function MapPage() {
  const [activeRoute, setActiveRoute] = useState<RouteRecord>(DEFAULT_ROUTE)
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('commuters')

  // 10-second clock ticker for expiring hazard pins and live relative timestamps
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])

  const { success } = useToast()

  const {
    connected,
    myPresence,
    peers,
    setRole,
    setStatusNote,
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

  const { alerts, submitAlert, voteStillThere, voteCleared } = useCorridorAlerts(
    activeRoute,
    myPresence,
    now,
  )

  const [isDropModalOpen, setIsDropModalOpen] = useState(false)
  const [dropModalCoords, setDropModalCoords] = useState<[number, number]>(
    DEFAULT_ROUTE.waypoints[0],
  )

  const handleLocateCoords = useCallback((coords: [number, number]) => {
    setFocusTarget({ coords, seq: Date.now() })
  }, [])

  const handleOpenDropAlert = useCallback(
    (coords?: [number, number]) => {
      setDropModalCoords(coords ?? [myPresence.lat, myPresence.lng])
      setIsDropModalOpen(true)
    },
    [myPresence.lat, myPresence.lng],
  )

  const handleSubmitAlert = async (alertInput: {
    type: AlertType
    lat: number
    lng: number
    note: string
  }) => {
    await submitAlert(alertInput)
    setActiveSidebarTab('alerts')
  }

  const handleBroadcastStatus = (statusText: string) => {
    setStatusNote(statusText)
    success('Status Updated', `Broadcasted "${statusText}" to active corridor presence!`)
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <RouteSelector
        routes={SEEDED_ROUTES}
        activeRoute={activeRoute}
        onSelectRoute={(route) => {
          setActiveRoute(route)
          setFocusTarget(null)
        }}
      />

      <div className="flex-1 relative flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 relative h-full w-full min-h-[350px]">
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
              activeAlertsCount={alerts.length}
            />
          </div>

          <MapCanvas
            activeRoute={activeRoute}
            focusTarget={focusTarget}
            onMapClick={handleOpenDropAlert}
          >
            <CommuterMarker commuter={myPresence} isSelf={true} />
            {peers.map((peer) => (
              <CommuterMarker key={peer.userId} commuter={peer} isSelf={false} />
            ))}
            {alerts.map((alert) => (
              <HazardMarker
                key={alert.id}
                alert={alert}
                currentUserId={myPresence.userId}
                now={now}
                onVoteStillThere={voteStillThere}
                onVoteCleared={voteCleared}
              />
            ))}
          </MapCanvas>
        </div>

        <CorridorSidebar
          activeRoute={activeRoute}
          activeTab={activeSidebarTab}
          onSelectTab={setActiveSidebarTab}
          connected={connected}
          myPresence={myPresence}
          peers={peers}
          isSimulating={isSimulating}
          simulationSpeed={simulationSpeed}
          alerts={alerts}
          now={now}
          onLocateCoords={handleLocateCoords}
          onOpenDropAlert={() => handleOpenDropAlert()}
          onVoteStillThere={voteStillThere}
          onVoteCleared={voteCleared}
          onBroadcastStatus={handleBroadcastStatus}
        />
      </div>

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
