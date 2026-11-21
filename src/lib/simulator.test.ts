import { describe, expect, it } from 'vitest'
import {
  haversineDistance,
  calculateBearing,
  calculateRouteTotalDistance,
  interpolatePositionAlongWaypoints,
} from './simulator'

describe('RouteRelay Commute Simulator', () => {
  const p1: [number, number] = [31.5204, 74.3587] // Lahore
  const p2: [number, number] = [32.1877, 74.1945] // Gujranwala
  const p3: [number, number] = [32.4945, 74.5229] // Sialkot

  it('calculates realistic haversine distance between cities', () => {
    const dist = haversineDistance(p1, p2)
    // Approximate distance between Lahore and Gujranwala is ~70-80 km
    expect(dist).toBeGreaterThan(65000)
    expect(dist).toBeLessThan(85000)
  })

  it('calculates forward bearing correctly', () => {
    // Northward direction has bearing close to 0 / 360
    const south: [number, number] = [30.0, 74.0]
    const north: [number, number] = [31.0, 74.0]
    const bearingNorth = calculateBearing(south, north)
    expect(bearingNorth).toBeCloseTo(0, 1)

    // Eastward direction has bearing close to 90
    const west: [number, number] = [31.0, 74.0]
    const east: [number, number] = [31.0, 75.0]
    const bearingEast = calculateBearing(west, east)
    expect(Math.round(bearingEast)).toBe(90)
  })

  it('sums total distance along multiple waypoints', () => {
    const total = calculateRouteTotalDistance([p1, p2, p3])
    const d1 = haversineDistance(p1, p2)
    const d2 = haversineDistance(p2, p3)
    expect(total).toBeCloseTo(d1 + d2, 1)
  })

  it('interpolates intermediate positions accurately along waypoints', () => {
    const waypoints: [number, number][] = [p1, p2]
    const totalDist = calculateRouteTotalDistance(waypoints)

    // At 0 meters, position should be exactly start
    const start = interpolatePositionAlongWaypoints(waypoints, 0)
    expect(start.position[0]).toBeCloseTo(p1[0], 4)
    expect(start.position[1]).toBeCloseTo(p1[1], 4)
    expect(start.progressPercent).toBe(0)

    // At halfway point, position should be midway between p1 and p2
    const halfway = interpolatePositionAlongWaypoints(waypoints, totalDist / 2)
    expect(halfway.position[0]).toBeCloseTo((p1[0] + p2[0]) / 2, 4)
    expect(halfway.position[1]).toBeCloseTo((p1[1] + p2[1]) / 2, 4)
    expect(halfway.progressPercent).toBeCloseTo(50, 1)

    // When exceeding total distance, wraps around cleanly
    const wrapped = interpolatePositionAlongWaypoints(waypoints, totalDist + 100)
    expect(wrapped.progressPercent).toBeLessThan(5)
  })
})
