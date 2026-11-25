import { describe, it, expect } from 'vitest'
import { SEEDED_ROUTES } from '../data/corridors'
import {
  createDefaultExpiresAt,
  isAlertExpired,
  formatTimeRemaining,
  formatRelativeTime,
  applyStillThereVote,
  applyClearedVote,
  getInitialCorridorAlerts,
  DEFAULT_ALERT_TTL_MS,
  MAX_EXPIRY_FROM_NOW_MS,
  ALERT_TYPE_CONFIGS,
} from './alerts'

describe('Hazard Alert Logic (Day 3)', () => {
  const baseTime = 1700000000000

  it('provides configuration for all 4 required AlertTypes', () => {
    expect(ALERT_TYPE_CONFIGS.traffic.label).toBe('Traffic Jam')
    expect(ALERT_TYPE_CONFIGS.checkpoint.label).toBe('Checkpoint')
    expect(ALERT_TYPE_CONFIGS.shuttle_full.label).toBe('Shuttle Full')
    expect(ALERT_TYPE_CONFIGS.roadblock.label).toBe('Roadblock')
  })

  it('calculates default expiration at 30 minutes', () => {
    const expiresAt = createDefaultExpiresAt(baseTime)
    expect(expiresAt - baseTime).toBe(DEFAULT_ALERT_TTL_MS)
    expect(expiresAt - baseTime).toBe(30 * 60 * 1000)
  })

  it('accurately identifies expired alerts', () => {
    const futureAlert = { expiresAt: baseTime + 10000 }
    const pastAlert = { expiresAt: baseTime - 1 }
    const exactAlert = { expiresAt: baseTime }

    expect(isAlertExpired(futureAlert, baseTime)).toBe(false)
    expect(isAlertExpired(pastAlert, baseTime)).toBe(true)
    expect(isAlertExpired(exactAlert, baseTime)).toBe(true)
  })

  it('formats remaining countdown time properly', () => {
    expect(formatTimeRemaining(baseTime + 25 * 60 * 1000, baseTime)).toBe('25m left')
    expect(formatTimeRemaining(baseTime + 30 * 1000, baseTime)).toBe('<1m left')
    expect(formatTimeRemaining(baseTime + 90 * 60 * 1000, baseTime)).toBe('1h 30m left')
    expect(formatTimeRemaining(baseTime - 1000, baseTime)).toBe('Expired')
  })

  it('formats relative created time properly', () => {
    expect(formatRelativeTime(baseTime - 10 * 1000, baseTime)).toBe('Just now')
    expect(formatRelativeTime(baseTime - 5 * 60 * 1000, baseTime)).toBe('5m ago')
    expect(formatRelativeTime(baseTime - 2 * 60 * 60 * 1000, baseTime)).toBe('2h ago')
  })

  describe('Still There (+15m) Voting', () => {
    it('extends expiration by 15 minutes when under 60-minute cap', () => {
      const initialAlert = {
        expiresAt: baseTime + 20 * 60 * 1000, // 20m from now
        confirmedBy: ['user-1'],
      }

      const result = applyStillThereVote(initialAlert, 'user-2', baseTime)
      expect(result).not.toBeNull()
      expect(result?.expiresAt).toBe(baseTime + 35 * 60 * 1000)
      expect(result?.confirmedBy).toEqual(['user-1', 'user-2'])
    })

    it('caps extended expiration at 60 minutes from now', () => {
      const initialAlert = {
        expiresAt: baseTime + 55 * 60 * 1000, // 55m from now
        confirmedBy: [],
      }

      const result = applyStillThereVote(initialAlert, 'user-3', baseTime)
      expect(result).not.toBeNull()
      // 55m + 15m = 70m -> should be capped at 60m
      expect(result?.expiresAt).toBe(baseTime + MAX_EXPIRY_FROM_NOW_MS)
      expect(result?.confirmedBy).toEqual(['user-3'])
    })

    it('prevents duplicate votes from the same user', () => {
      const initialAlert = {
        expiresAt: baseTime + 20 * 60 * 1000,
        confirmedBy: ['user-1', 'user-2'],
      }

      const result = applyStillThereVote(initialAlert, 'user-1', baseTime)
      expect(result).toBeNull()
    })
  })

  describe('Cleared Voting & Auto-Archive', () => {
    it('records first cleared vote without archiving immediately', () => {
      const initialAlert = {
        expiresAt: baseTime + 20 * 60 * 1000,
        clearedBy: [],
      }

      const result = applyClearedVote(initialAlert, 'user-1', baseTime)
      expect(result).not.toBeNull()
      expect(result?.clearedBy).toEqual(['user-1'])
      expect(result?.shouldArchive).toBe(false)
      expect(result?.expiresAt).toBe(initialAlert.expiresAt)
    })

    it('immediately auto-expires/archives alert when 2 unique users mark cleared', () => {
      const initialAlert = {
        expiresAt: baseTime + 20 * 60 * 1000,
        clearedBy: ['user-1'],
      }

      const result = applyClearedVote(initialAlert, 'user-2', baseTime)
      expect(result).not.toBeNull()
      expect(result?.clearedBy).toEqual(['user-1', 'user-2'])
      expect(result?.shouldArchive).toBe(true)
      expect(result?.expiresAt).toBeLessThan(baseTime)
    })

    it('prevents duplicate cleared votes from the same user', () => {
      const initialAlert = {
        expiresAt: baseTime + 20 * 60 * 1000,
        clearedBy: ['user-1'],
      }

      const result = applyClearedVote(initialAlert, 'user-1', baseTime)
      expect(result).toBeNull()
    })
  })

  it('provides starter alerts matching every seeded corridor ID', () => {
    for (const route of SEEDED_ROUTES) {
      const starterAlerts = getInitialCorridorAlerts(route.id, baseTime)
      expect(starterAlerts.length).toBeGreaterThan(0)
      expect(starterAlerts.every((a) => a.routeId === route.id)).toBe(true)
    }
  })
})
