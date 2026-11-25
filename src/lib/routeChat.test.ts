import { describe, expect, it } from 'vitest'
import {
  COMMUTER_QUICK_CHIPS,
  getQuickChipsForRole,
  getRouteChannelName,
  getInitialRouteMessages,
} from './routeChat'

describe('routeChat module', () => {
  it('contains the essential commuter quick status chips', () => {
    const labels = COMMUTER_QUICK_CHIPS.map((c) => c.label)
    expect(labels).toContain('At Main Gate')
    expect(labels).toContain('Leaving in 5m')
    expect(labels).toContain('2 Seats Available')
    expect(labels).toContain('Heavy Traffic Ahead')
    expect(labels).toContain('Shuttle Just Arrived')
  })

  it('filters quick chips by commuter role correctly', () => {
    const driverChips = getQuickChipsForRole('driver')
    const waitingChips = getQuickChipsForRole('waiting')
    const shuttleChips = getQuickChipsForRole('on_shuttle')

    expect(driverChips.some((c) => c.label === '2 Seats Available')).toBe(true)
    expect(waitingChips.some((c) => c.label === '2 Seats Available')).toBe(false)
    expect(shuttleChips.some((c) => c.label === 'Bus Full / Standing Only')).toBe(true)
    expect(driverChips.some((c) => c.label === 'At Main Gate')).toBe(true)
    expect(waitingChips.some((c) => c.label === 'At Main Gate')).toBe(true)
  })

  it('formats route channel name consistently', () => {
    expect(getRouteChannelName('gt-road-grw-ksk')).toBe('route-gt-road-grw-ksk')
    expect(getRouteChannelName('lahore-ksk-shuttle')).toBe('route-lahore-ksk-shuttle')
    expect(getRouteChannelName('KSK-CAMPUS-LOOP')).toBe('route-ksk-campus-loop')
  })

  it('returns seeded corridor messages for each corridor', () => {
    const grwMsgs = getInitialRouteMessages('gt-road-grw-ksk')
    expect(grwMsgs.length).toBeGreaterThan(0)
    expect(grwMsgs[0].routeId).toBe('gt-road-grw-ksk')
    expect(grwMsgs[0].authorName).toBeDefined()
    expect(grwMsgs[0].content).toBeDefined()

    const lhrMsgs = getInitialRouteMessages('lahore-ksk-shuttle')
    expect(lhrMsgs.length).toBeGreaterThan(0)

    const loopMsgs = getInitialRouteMessages('ksk-campus-loop')
    expect(loopMsgs.length).toBeGreaterThan(0)
  })
})
