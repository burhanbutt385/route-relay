import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser, usePresenceRoom } from 'deepspace'
import type { CommuterPresence, CommuterRole, RouteRecord } from '../types/routerelay'
import { findDistanceToStop, interpolatePositionAlongWaypoints } from '../lib/simulator'

const BROADCAST_INTERVAL_MS = 3000
const SIM_TICK_MS = 250
const MAX_SIM_DT_SEC = 1

function getOrCreateGuestIdentity(): { id: string; name: string } {
  if (typeof window === 'undefined') {
    return { id: 'guest-preview', name: 'Commuter #1' }
  }
  let id = sessionStorage.getItem('routerelay_commuter_id')
  let name = sessionStorage.getItem('routerelay_commuter_name')

  if (!id) {
    id = `guest-${Math.random().toString(36).substring(2, 8)}`
    sessionStorage.setItem('routerelay_commuter_id', id)
  }
  if (!name) {
    const num = Math.floor(10 + Math.random() * 90)
    name = `Commuter #${num}`
    sessionStorage.setItem('routerelay_commuter_name', name)
  }
  return { id, name }
}

export interface UseCommuterPresenceResult {
  connected: boolean
  myPresence: CommuterPresence
  peers: CommuterPresence[]
  setRole: (role: CommuterRole) => void
  statusNote?: string
  setStatusNote: (note: string | undefined) => void
  isSimulating: boolean
  toggleSimulating: () => void
  simulationSpeed: number
  setSimulationSpeed: (speed: number) => void
  simulatedProgress: number
  useGps: boolean
  toggleGps: () => void
  gpsError: string | null
  jumpToStop: (stopIndex: number) => void
}

export function useCommuterPresence(activeRoute: RouteRecord): UseCommuterPresenceResult {
  const { user } = useAuthUser()
  const guestIdentity = useMemo(() => getOrCreateGuestIdentity(), [])

  const userId = user?.id || guestIdentity.id
  const displayName = user?.fullName || user?.firstName || guestIdentity.name

  const roomScope = `route:${activeRoute.id}`
  const { peers: rawPeers, connected, updateState } = usePresenceRoom(roomScope)

  const [role, setRole] = useState<CommuterRole>('on_shuttle')
  const [statusNote, setStatusNote] = useState<string | undefined>(undefined)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationSpeed, setSimulationSpeed] = useState<number>(60) // km/h
  const [useGps, setUseGps] = useState<boolean>(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const simulatedDistanceRef = useRef<number>(0)
  const [currentCoords, setCurrentCoords] = useState<[number, number]>(
    () => activeRoute.waypoints[0] || [31.5204, 74.3587],
  )
  const [currentHeading, setCurrentHeading] = useState<number>(0)
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0)

  // Reset corridor position and simulator progress cleanly whenever the active route changes.
  useEffect(() => {
    if (activeRoute.waypoints.length > 0) {
      simulatedDistanceRef.current = 0
      setCurrentCoords(activeRoute.waypoints[0])
      setCurrentHeading(0)
      setSimulatedProgress(0)
      setStatusNote(undefined)
    }
  }, [activeRoute])

  // Geolocation watcher
  useEffect(() => {
    if (!useGps || typeof navigator === 'undefined' || !navigator.geolocation) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setGpsError(null)
        if (!isSimulating) {
          setCurrentCoords(coords)
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            setCurrentHeading(pos.coords.heading)
          }
        }
      },
      (err) => {
        setGpsError(err.message || 'Location permission denied')
        setUseGps(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [useGps, isSimulating])

  // Simulation loop throttled to 4 Hz with capped dt so backgrounded tabs never teleport.
  useEffect(() => {
    if (!isSimulating || activeRoute.waypoints.length < 2) return

    let lastTick = performance.now()
    const timer = setInterval(() => {
      const nowTick = performance.now()
      const dt = Math.min(Math.max(0, (nowTick - lastTick) / 1000), MAX_SIM_DT_SEC)
      lastTick = nowTick

      const speedMps = (simulationSpeed * 1000) / 3600
      simulatedDistanceRef.current += speedMps * dt

      const interpolated = interpolatePositionAlongWaypoints(
        activeRoute.waypoints,
        simulatedDistanceRef.current,
      )
      setCurrentCoords(interpolated.position)
      setCurrentHeading(interpolated.heading)
      setSimulatedProgress(interpolated.progressPercent)
    }, SIM_TICK_MS)

    return () => clearInterval(timer)
  }, [isSimulating, activeRoute, simulationSpeed])

  const jumpToStop = useCallback(
    (stopIndex: number) => {
      if (stopIndex < 0 || stopIndex >= activeRoute.stops.length) return
      const stop = activeRoute.stops[stopIndex]
      const distanceToStop = findDistanceToStop(activeRoute.waypoints, [stop.lat, stop.lng])
      simulatedDistanceRef.current = distanceToStop

      const interpolated = interpolatePositionAlongWaypoints(activeRoute.waypoints, distanceToStop)
      setCurrentCoords(interpolated.position)
      setCurrentHeading(interpolated.heading)
      setSimulatedProgress(interpolated.progressPercent)
    },
    [activeRoute],
  )

  const myPresence: CommuterPresence = useMemo(
    () => ({
      userId,
      displayName,
      routeId: activeRoute.id,
      role,
      lat: currentCoords[0],
      lng: currentCoords[1],
      isSimulated: isSimulating,
      updatedAt: Date.now(),
      heading: currentHeading,
      speedKmh: isSimulating ? simulationSpeed : 0,
      statusNote,
    }),
    [
      userId,
      displayName,
      activeRoute.id,
      role,
      currentCoords,
      isSimulating,
      currentHeading,
      simulationSpeed,
      statusNote,
    ],
  )

  // Throttled presence sender (broadcasts every 3000ms, plus immediately on route/role/status changes)
  const myPresenceRef = useRef(myPresence)
  myPresenceRef.current = myPresence

  useEffect(() => {
    if (!connected) return

    const sendState = () => {
      const p = myPresenceRef.current
      updateState({
        role: p.role,
        lat: p.lat,
        lng: p.lng,
        isSimulated: p.isSimulated,
        heading: p.heading,
        speedKmh: p.speedKmh,
        displayName: p.displayName,
        routeId: p.routeId,
        statusNote: p.statusNote,
        updatedAt: Date.now(),
      })
    }

    sendState()
    const interval = setInterval(sendState, BROADCAST_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [connected, updateState, activeRoute.id, role, statusNote])

  const peers: CommuterPresence[] = useMemo(() => {
    const list: CommuterPresence[] = []
    for (const peer of rawPeers) {
      const state = peer.state as Partial<CommuterPresence> | undefined
      if (typeof state?.lat === 'number' && typeof state?.lng === 'number') {
        const item: CommuterPresence = {
          userId: peer.userId,
          displayName: (state.displayName as string) || peer.userName || 'Commuter',
          routeId: (state.routeId as string) || activeRoute.id,
          role: (state.role as CommuterRole) || 'waiting',
          lat: state.lat,
          lng: state.lng,
          isSimulated: Boolean(state.isSimulated),
          updatedAt: (state.updatedAt as number) || Date.now(),
        }
        if (typeof state.heading === 'number') {
          item.heading = state.heading
        }
        if (typeof state.speedKmh === 'number') {
          item.speedKmh = state.speedKmh
        }
        if (typeof state.statusNote === 'string') {
          item.statusNote = state.statusNote
        }
        list.push(item)
      }
    }
    return list
  }, [rawPeers, activeRoute.id])

  const toggleSimulating = useCallback(() => {
    setIsSimulating((prev) => !prev)
  }, [])

  const toggleGps = useCallback(() => {
    setUseGps((prev) => !prev)
  }, [])

  return {
    connected,
    myPresence,
    peers,
    setRole,
    statusNote,
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
  }
}
