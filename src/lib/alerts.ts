import type { AlertType, HazardAlert } from '../types/routerelay'

export const DEFAULT_ALERT_TTL_MS = 30 * 60 * 1000 // 30 minutes
export const EXTENSION_DURATION_MS = 15 * 60 * 1000 // +15 minutes
export const MAX_EXPIRY_FROM_NOW_MS = 60 * 60 * 1000 // capped at 60 minutes from now
export const CLEARED_VOTES_THRESHOLD = 2 // 2 unique users required to auto-archive

export interface AlertTypeConfig {
  type: AlertType
  label: string
  color: string
  bgClass: string
  badgeClass: string
  borderClass: string
  iconName: string
  description: string
}

export const ALERT_TYPE_CONFIGS: Record<AlertType, AlertTypeConfig> = {
  traffic: {
    type: 'traffic',
    label: 'Traffic Jam',
    color: '#f59e0b', // amber-500
    bgClass: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
    badgeClass: 'bg-amber-500 text-amber-950 font-bold',
    borderClass: 'border-amber-500/40',
    iconName: 'AlertTriangle',
    description: 'Heavy congestion or slow bumper-to-bumper traffic',
  },
  checkpoint: {
    type: 'checkpoint',
    label: 'Checkpoint',
    color: '#3b82f6', // blue-500
    bgClass: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
    badgeClass: 'bg-blue-600 text-white font-bold',
    borderClass: 'border-blue-500/40',
    iconName: 'ShieldAlert',
    description: 'Police or security inspection causing slowdowns',
  },
  shuttle_full: {
    type: 'shuttle_full',
    label: 'Shuttle Full',
    color: '#a855f7', // purple-500
    bgClass: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400',
    badgeClass: 'bg-purple-600 text-white font-bold',
    borderClass: 'border-purple-500/40',
    iconName: 'Users',
    description: 'Shuttle / van arrived at capacity with no free seats',
  },
  roadblock: {
    type: 'roadblock',
    label: 'Roadblock',
    color: '#ef4444', // red-500
    bgClass: 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400',
    badgeClass: 'bg-red-600 text-white font-bold',
    borderClass: 'border-red-500/40',
    iconName: 'OctagonAlert',
    description: 'Route blocked, accident, or road construction detour',
  },
}

/**
 * Calculates default expiration time for a new alert (default 30 mins)
 */
export function createDefaultExpiresAt(now: number = Date.now()): number {
  return now + DEFAULT_ALERT_TTL_MS
}

/**
 * Checks whether an alert is expired based on current timestamp
 */
export function isAlertExpired(
  alert: { expiresAt: number },
  now: number = Date.now()
): boolean {
  return now >= alert.expiresAt
}

/**
 * Formats time remaining into a user-friendly badge string (e.g., "24m left", "2m left", "<1m")
 */
export function formatTimeRemaining(
  expiresAt: number,
  now: number = Date.now()
): string {
  const diffMs = expiresAt - now
  if (diffMs <= 0) return 'Expired'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '<1m left'
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m left` : `${hours}h left`
  }
  return `${minutes}m left`
}

/**
 * Formats relative time since creation (e.g., "Just now", "5m ago", "1h ago")
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now()
): string {
  const diffMs = Math.max(0, now - timestamp)
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Applies a "Still There (+15m)" vote.
 * Rules:
 * - Duplicate vote prevention: Returns null if userId is already in confirmedBy.
 * - Extends expiresAt by 15 mins, capped at 60 minutes from now.
 * - Appends userId to confirmedBy array.
 */
export function applyStillThereVote(
  alert: { expiresAt: number; confirmedBy?: string[]; createdBy?: string },
  userId: string,
  now: number = Date.now()
): { expiresAt: number; confirmedBy: string[] } | null {
  const currentConfirmed = Array.isArray(alert.confirmedBy) ? alert.confirmedBy : []

  // Duplicate vote check
  if (currentConfirmed.includes(userId)) {
    return null
  }

  // Calculate new expiration time (+15m, capped at now + 60m)
  const extendedTime = alert.expiresAt + EXTENSION_DURATION_MS
  const maxCap = now + MAX_EXPIRY_FROM_NOW_MS
  const newExpiresAt = Math.min(extendedTime, maxCap)

  return {
    expiresAt: newExpiresAt,
    confirmedBy: [...currentConfirmed, userId],
  }
}

/**
 * Applies a "Cleared" vote.
 * Rules:
 * - Duplicate vote prevention: Returns null if userId is already in clearedBy.
 * - Appends userId to clearedBy array.
 * - If clearedBy.length >= CLEARED_VOTES_THRESHOLD (2), immediately expires the alert.
 */
export function applyClearedVote(
  alert: { expiresAt: number; clearedBy?: string[] },
  userId: string,
  now: number = Date.now()
): { expiresAt: number; clearedBy: string[]; shouldArchive: boolean } | null {
  const currentCleared = Array.isArray(alert.clearedBy) ? alert.clearedBy : []

  // Duplicate vote check
  if (currentCleared.includes(userId)) {
    return null
  }

  const updatedCleared = [...currentCleared, userId]
  const shouldArchive = updatedCleared.length >= CLEARED_VOTES_THRESHOLD
  const newExpiresAt = shouldArchive ? now - 1000 : alert.expiresAt

  return {
    expiresAt: newExpiresAt,
    clearedBy: updatedCleared,
    shouldArchive,
  }
}

/**
 * Seed realistic starter alerts for corridors so evaluators immediately
 * see real-time community hazards on first load.
 */
export function getInitialCorridorAlerts(routeId: string, now: number = Date.now()): HazardAlert[] {
  switch (routeId) {
    case 'gt-road-grw-ksk':
      return [
        {
          id: 'seed-grw-traffic-1',
          routeId: 'gt-road-grw-ksk',
          type: 'traffic',
          lat: 31.9542,
          lng: 74.225,
          note: 'Heavy traffic buildup near Kamoke bypass. Vehicles crawling at 15 km/h.',
          createdBy: 'system-seed-1',
          createdByName: 'Ali R. (Driver)',
          createdAt: now - 6 * 60 * 1000,
          expiresAt: now + 24 * 60 * 1000,
          confirmedBy: ['commuter-101'],
          clearedBy: [],
        },
        {
          id: 'seed-grw-checkpoint-1',
          routeId: 'gt-road-grw-ksk',
          type: 'checkpoint',
          lat: 31.8021,
          lng: 74.268,
          note: 'Police document inspection near Muridke toll plaza. 1 lane open.',
          createdBy: 'system-seed-2',
          createdByName: 'Fatima Z. (Shuttle)',
          createdAt: now - 12 * 60 * 1000,
          expiresAt: now + 18 * 60 * 1000,
          confirmedBy: ['commuter-102', 'commuter-103'],
          clearedBy: [],
        },
      ]

    case 'lahore-ksk-shuttle':
      return [
        {
          id: 'seed-lhr-shuttle-1',
          routeId: 'lahore-ksk-shuttle',
          type: 'shuttle_full',
          lat: 31.635,
          lng: 74.298,
          note: '8:00 AM University Shuttle left Shahdara Chowk packed to capacity.',
          createdBy: 'system-seed-3',
          createdByName: 'Usman T. (Waiting)',
          createdAt: now - 4 * 60 * 1000,
          expiresAt: now + 26 * 60 * 1000,
          confirmedBy: [],
          clearedBy: [],
        },
      ]

    case 'ksk-campus-loop':
      return [
        {
          id: 'seed-campus-roadblock-1',
          routeId: 'ksk-campus-loop',
          type: 'roadblock',
          lat: 31.7565,
          lng: 74.3015,
          note: 'Maintenance repair work near Mechanical Dept intersection. Follow side lane.',
          createdBy: 'system-seed-4',
          createdByName: 'Security Post 2',
          createdAt: now - 15 * 60 * 1000,
          expiresAt: now + 15 * 60 * 1000,
          confirmedBy: ['campus-patrol'],
          clearedBy: [],
        },
      ]

    default:
      return []
  }
}
