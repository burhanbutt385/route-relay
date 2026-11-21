import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser, usePresenceRoom } from 'deepspace'
import type { CommuterPresence, CommuterRole, RouteRecord } from '../types/routerelay'
import {
  calculateRouteTotalDistance,
  haversineDistance,
  interpolatePositionAlongWaypoints,
} from '../lib/simulator'

const BROADCAST_INTERVAL_MS = 3000

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
  const { user, isLoaded } = useAuthUser()
  const guestIdentity = useMemo(() => getOrCreateGuestIdentity(), [])

  const userId = user?.id || guestIdentity.id
  const displayName = user?.fullName || user?.firstName || guestIdentity.name

  // Presence room connection tied to the current route corridor
  const roomScope = `route:${activeRoute.id}`
  const { peers: rawPeers, connected, updateState } = usePresenceRoom(roomScope)

  // Local commuter state
  const [role, setRole] = useState<CommuterRole>('on_shuttle')
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationSpeed, setSimulationSpeed] = useState<number>(60) // km/h
  const [simulatedDistance, setSimulatedDistance] = useState<number>(0)
  const [useGps, setUseGps] = useState<boolean>(false)
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Current calculated coordinates & heading
  const [currentCoords, setCurrentCoords] = useState<[number, number]>(() => {
    return activeRoute.waypoints[0] || [31.5204, 74.3587]
  })
  const [currentHeading, setCurrentHeading] = useState<number>(0)
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0)

  // When activeRoute changes, reset position if not simulating
  useEffect(() => {
    if (!isSimulating && activeRoute.waypoints.length > 0) {
      setCurrentCoords(activeRoute.waypoints[0])
      setSimulatedDistance(0)
      setSimulatedProgress(0)
    }
  }, [activeRoute, isSimulating])

  // Geolocation watcher
  useEffect(() => {
    if (!useGps || typeof navigator === 'undefined' || !navigator.geolocation) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setGpsLocation(coords)
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

  // Simulation engine animation loop
  const lastTimeRef = useRef<number>(performance.now())
  useEffect(() => {
    if (!isSimulating || activeRoute.waypoints.length < 2) return

    let animId: number
    lastTimeRef.current = performance.now()

    const step = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000 // seconds
      lastTimeRef.current = time

      // distance = speed (m/s) * time (s)
      const speedMps = (simulationSpeed * 1000) / 3600
      const deltaMeters = speedMps * dt

      setSimulatedDistance((prev) => {
        const nextDist = prev + deltaMeters
        const interpolated = interpolatePositionAlongWaypoints(activeRoute.waypoints, nextDist)
        setCurrentCoords(interpolated.position)
        setCurrentHeading(interpolated.heading)
        setSimulatedProgress(interpolated.progressPercent)
        return nextDist
      })

      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isSimulating, activeRoute, simulationSpeed])

  // Jump simulator position to a designated stop
  const jumpToStop = useCallback(
    (stopIndex: number) => {
      if (stopIndex < 0 || stopIndex >= activeRoute.stops.length) return
      const stop = activeRoute.stops[stopIndex]
      const stopCoord: [number, number] = [stop.lat, stop.lng]

      // Calculate distance along waypoints up to this stop
      let distanceToStop = 0
      for (let i = 0; i < activeRoute.waypoints.length - 1; i++) {
        const p1 = activeRoute.waypoints[i]
        const p2 = activeRoute.waypoints[i + 1]
        const dToP1 = haversineDistance(stopCoord, p1)
        if (dToP1 < 200) {
          break
        }
        distanceToStop += haversineDistance(p1, p2)
      }

      setSimulatedDistance(distanceToStop)
      const interpolated = interpolatePositionAlongWaypoints(activeRoute.waypoints, distanceToStop)
      setCurrentCoords(interpolated.position)
      setCurrentHeading(interpolated.heading)
      setSimulatedProgress(interpolated.progressPercent)
    },
    [activeRoute],
  )

  // My presence object
  const myPresence: CommuterPresence = useMemo(() => {
    return {
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
    }
  }, [
    userId,
    displayName,
    activeRoute.id,
    role,
    currentCoords,
    isSimulating,
    currentHeading,
    simulationSpeed,
  ])

  // Throttled presence sender (broadcasts every 3000ms over WebSocket)
  const myPresenceRef = useRef(myPresence)
  myPresenceRef.current = myPresence

  useEffect(() => {
    if (!connected) return

    // Immediate initial broadcast
    updateState({
      role: myPresenceRef.current.role,
      lat: myPresenceRef.current.lat,
      lng: myPresenceRef.current.lng,
      isSimulated: myPresenceRef.current.isSimulated,
      heading: myPresenceRef.current.heading,
      speedKmh: myPresenceRef.current.speedKmh,
      displayName: myPresenceRef.current.displayName,
      routeId: myPresenceRef.current.routeId,
      updatedAt: Date.now(),
    })

    const interval = setInterval(() => {
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
        updatedAt: Date.now(),
      })
    }, BROADCAST_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [connected, updateState, activeRoute.id])

  // Extract and filter connected peers
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
