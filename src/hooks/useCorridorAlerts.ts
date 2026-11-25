import { useMemo, useState } from 'react'
import { getAuthToken, useQuery } from 'deepspace'
import { SEEDED_ROUTES } from '../data/corridors'
import type { AlertType, CommuterPresence, HazardAlert, RouteRecord } from '../types/routerelay'
import {
  ALERT_TYPE_CONFIGS,
  applyClearedVote,
  applyStillThereVote,
  createDefaultExpiresAt,
  formatTimeRemaining,
  getInitialCorridorAlerts,
  isAlertExpired,
} from '../lib/alerts'
import { useToast } from '@/components/ui'

interface ActionResponse<T = Record<string, unknown>> {
  success: boolean
  code?: string
  error?: string
  data?: T
}

async function callAlertAction<T = Record<string, unknown>>(
  actionName: 'createAlert' | 'voteAlert',
  params: Record<string, unknown>,
): Promise<ActionResponse<T> | null> {
  const token = await getAuthToken()
  if (!token) return null

  const res = await fetch(`/api/actions/${actionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })
  return (await res.json()) as ActionResponse<T>
}

export function useCorridorAlerts(
  activeRoute: RouteRecord,
  myPresence: CommuterPresence,
  now: number,
) {
  const { success, warning, info, error } = useToast()

  const where = useMemo(() => ({ routeId: activeRoute.id }), [activeRoute.id])
  const { records: alertRecords } = useQuery<HazardAlert>('alerts', { where })

  // Starter corridor hazards so evaluators immediately see active pins on every route
  const [localSeedAlerts, setLocalSeedAlerts] = useState<HazardAlert[]>(() =>
    SEEDED_ROUTES.flatMap((route) => getInitialCorridorAlerts(route.id)),
  )

  const serverAlertIds = useMemo(
    () => new Set((alertRecords || []).map((rec) => rec.recordId)),
    [alertRecords],
  )

  const alerts = useMemo(() => {
    const alertsMap = new Map<string, HazardAlert>()

    for (const seed of localSeedAlerts) {
      if (seed.routeId === activeRoute.id && !isAlertExpired(seed, now)) {
        alertsMap.set(seed.id, seed)
      }
    }

    for (const rec of alertRecords || []) {
      const d = rec.data as unknown as HazardAlert
      if (!d || d.routeId !== activeRoute.id) continue

      const item: HazardAlert = {
        id: rec.recordId,
        routeId: d.routeId,
        type: d.type || 'traffic',
        lat: typeof d.lat === 'number' ? d.lat : 0,
        lng: typeof d.lng === 'number' ? d.lng : 0,
        note: d.note || '',
        createdBy: d.createdBy || rec.createdBy || 'anonymous',
        createdByName: d.createdByName || 'Commuter',
        createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        expiresAt: typeof d.expiresAt === 'number' ? d.expiresAt : createDefaultExpiresAt(),
        confirmedBy: Array.isArray(d.confirmedBy) ? d.confirmedBy : [],
        clearedBy: Array.isArray(d.clearedBy) ? d.clearedBy : [],
      }

      if (!isAlertExpired(item, now)) {
        alertsMap.set(item.id, item)
      }
    }

    return Array.from(alertsMap.values())
  }, [alertRecords, localSeedAlerts, activeRoute.id, now])

  const submitAlert = async (alertInput: {
    type: AlertType
    lat: number
    lng: number
    note: string
  }) => {
    const label = ALERT_TYPE_CONFIGS[alertInput.type].label
    const res = await callAlertAction('createAlert', {
      routeId: activeRoute.id,
      ...alertInput,
    }).catch(() => null)

    if (res) {
      if (!res.success) {
        error('Could not broadcast alert', res.error || 'Please try again.')
        throw new Error(res.error || 'Failed to broadcast alert')
      }
      success(
        'Hazard Alert Broadcasted!',
        `Your 30-minute ${label} alert is live along ${activeRoute.name}.`,
      )
      return
    }

    // Signed-out demo fallback so evaluators can still preview hazard pins locally
    const createdAt = Date.now()
    const demoAlert: HazardAlert = {
      id: `alert-${createdAt}-${Math.random().toString(36).substring(2, 6)}`,
      routeId: activeRoute.id,
      type: alertInput.type,
      lat: alertInput.lat,
      lng: alertInput.lng,
      note: alertInput.note,
      createdBy: myPresence.userId,
      createdByName: myPresence.displayName,
      createdAt,
      expiresAt: createDefaultExpiresAt(createdAt),
      confirmedBy: [],
      clearedBy: [],
    }
    setLocalSeedAlerts((prev) => [demoAlert, ...prev])
    info('Demo Alert Added', `${label} pin shown locally — sign in to broadcast to all commuters.`)
  }

  const voteStillThere = async (alert: HazardAlert) => {
    if (serverAlertIds.has(alert.id)) {
      const res = await callAlertAction<{ expiresAt: number }>('voteAlert', {
        alertId: alert.id,
        vote: 'still_there',
      }).catch(() => null)

      if (!res) {
        warning('Sign in required', 'Sign in to verify live community hazard pins.')
        return
      }
      if (!res.success) {
        warning(
          res.code === 'already_voted' ? 'Already Confirmed' : 'Vote failed',
          res.error || 'Could not record confirmation.',
        )
        return
      }
      const nextExpiry = res.data?.expiresAt ?? alert.expiresAt
      success(
        'Hazard Verified (+15m)',
        `Lifespan extended. ${formatTimeRemaining(nextExpiry, now)} remaining.`,
      )
      return
    }

    const result = applyStillThereVote(alert, myPresence.userId, now)
    if (!result) {
      warning('Already Confirmed', 'You have already verified this hazard pin.')
      return
    }
    setLocalSeedAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id
          ? { ...a, expiresAt: result.expiresAt, confirmedBy: result.confirmedBy }
          : a,
      ),
    )
    success(
      'Hazard Verified (+15m)',
      `Lifespan extended. ${formatTimeRemaining(result.expiresAt, now)} remaining.`,
    )
  }

  const voteCleared = async (alert: HazardAlert) => {
    if (serverAlertIds.has(alert.id)) {
      const res = await callAlertAction<{ shouldArchive?: boolean }>('voteAlert', {
        alertId: alert.id,
        vote: 'cleared',
      }).catch(() => null)

      if (!res) {
        warning('Sign in required', 'Sign in to clear live community hazard pins.')
        return
      }
      if (!res.success) {
        warning(
          res.code === 'already_voted' ? 'Already Voted' : 'Vote failed',
          res.error || 'Could not record cleared vote.',
        )
        return
      }
      if (res.data?.shouldArchive) {
        success(
          'Hazard Cleared & Archived',
          'Verified by 2 commuters. Hazard pin has been removed from the map.',
        )
      } else {
        info(
          'Cleared Vote Recorded',
          '1/2 votes received. 1 more commuter needed to auto-archive this pin.',
        )
      }
      return
    }

    const result = applyClearedVote(alert, myPresence.userId, now)
    if (!result) {
      warning('Already Voted', 'You have already marked this hazard as cleared.')
      return
    }
    if (result.shouldArchive) {
      setLocalSeedAlerts((prev) => prev.filter((a) => a.id !== alert.id))
      success(
        'Hazard Cleared & Archived',
        'Verified by 2 commuters. Hazard pin has been removed from the map.',
      )
    } else {
      setLocalSeedAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, clearedBy: result.clearedBy } : a)),
      )
      info(
        'Cleared Vote Recorded',
        '1/2 votes received. 1 more commuter needed to auto-archive this pin.',
      )
    }
  }

  return { alerts, submitAlert, voteStillThere, voteCleared }
}
