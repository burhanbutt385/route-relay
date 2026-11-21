/**
 * RouteRelay Commuter Simulator Engine
 *
 * Provides geospatial calculations (Haversine distance, bearing) and
 * polyline distance interpolation to allow reviewers and commuters to test
 * live vehicle movement along corridor waypoints without physical travel.
 */

const EARTH_RADIUS_METERS = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/**
 * Calculates great-circle distance between two [lat, lng] coordinates in meters.
 */
export function haversineDistance(c1: [number, number], c2: [number, number]): number {
  const [lat1, lng1] = c1
  const [lat2, lng2] = c2

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/**
 * Calculates forward compass bearing from c1 to c2 in degrees (0 to 360).
 */
export function calculateBearing(c1: [number, number], c2: [number, number]): number {
  const [lat1, lng1] = c1
  const [lat2, lng2] = c2

  const phi1 = toRad(lat1)
  const phi2 = toRad(lat2)
  const deltaLambda = toRad(lng2 - lng1)

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)

  const initialBearing = toDeg(Math.atan2(y, x))
  return (initialBearing + 360) % 360
}

/**
 * Calculates the total length of a polyline in meters.
 */
export function calculateRouteTotalDistance(waypoints: [number, number][]): number {
  if (waypoints.length < 2) return 0
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(waypoints[i], waypoints[i + 1])
  }
  return total
}

export interface InterpolatedPoint {
  position: [number, number]
  heading: number
  segmentIndex: number
  progressPercent: number
}

/**
 * Finds the interpolated coordinate and bearing along a polyline at a given distance in meters.
 * Wraps smoothly if distance exceeds the total length.
 */
export function interpolatePositionAlongWaypoints(
  waypoints: [number, number][],
  targetDistanceMeters: number,
): InterpolatedPoint {
  if (waypoints.length === 0) {
    return { position: [0, 0], heading: 0, segmentIndex: 0, progressPercent: 0 }
  }
  if (waypoints.length === 1) {
    return { position: waypoints[0], heading: 0, segmentIndex: 0, progressPercent: 100 }
  }

  const totalDistance = calculateRouteTotalDistance(waypoints)
  if (totalDistance <= 0) {
    return { position: waypoints[0], heading: 0, segmentIndex: 0, progressPercent: 0 }
  }

  // Wrap around if route loops
  const clampedDistance = targetDistanceMeters % totalDistance
  const progressPercent = Math.min(100, Math.max(0, (clampedDistance / totalDistance) * 100))

  let accumulated = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i]
    const p2 = waypoints[i + 1]
    const segDist = haversineDistance(p1, p2)

    if (accumulated + segDist >= clampedDistance || i === waypoints.length - 2) {
      const remaining = clampedDistance - accumulated
      const fraction = segDist > 0 ? Math.min(1, Math.max(0, remaining / segDist)) : 0

      const lat = p1[0] + (p2[0] - p1[0]) * fraction
      const lng = p1[1] + (p2[1] - p1[1]) * fraction
      const heading = calculateBearing(p1, p2)

      return {
        position: [lat, lng],
        heading,
        segmentIndex: i,
        progressPercent,
      }
    }

    accumulated += segDist
  }

  const last = waypoints[waypoints.length - 1]
  const secondLast = waypoints[waypoints.length - 2]
  return {
    position: last,
    heading: calculateBearing(secondLast, last),
    segmentIndex: waypoints.length - 2,
    progressPercent: 100,
  }
}
