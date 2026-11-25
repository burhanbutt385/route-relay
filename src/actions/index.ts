import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { SEEDED_ROUTES } from '../data/corridors'
import type { AlertType, HazardAlert } from '../types/routerelay'
import {
  ALERT_TYPE_CONFIGS,
  applyClearedVote,
  applyStillThereVote,
  createDefaultExpiresAt,
  isAlertExpired,
} from '../lib/alerts'

const VALID_ROUTE_IDS = new Set(SEEDED_ROUTES.map((r) => r.id))
const VALID_ALERT_TYPES = new Set(Object.keys(ALERT_TYPE_CONFIGS))

export const actions: Record<string, ActionHandler<Env>> = {
  createAlert: async ({ userId, params, tools }) => {
    const routeId = typeof params.routeId === 'string' ? params.routeId : ''
    const type = typeof params.type === 'string' ? (params.type as AlertType) : ('' as AlertType)
    const lat = params.lat
    const lng = params.lng
    const note = typeof params.note === 'string' ? params.note.trim() : ''

    if (!VALID_ROUTE_IDS.has(routeId)) {
      return { success: false, error: 'Unknown corridor route.' }
    }
    if (!VALID_ALERT_TYPES.has(type)) {
      return { success: false, error: 'Invalid hazard alert type.' }
    }
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return { success: false, error: 'Invalid coordinates.' }
    }
    if (!note || note.length > 120) {
      return { success: false, error: 'Note must be between 1 and 120 characters.' }
    }

    const userRow = await tools.get<{ name?: string; email?: string }>('users', userId)
    const createdByName =
      userRow.success && userRow.data?.record?.data?.name
        ? String(userRow.data.record.data.name)
        : 'Commuter'

    const now = Date.now()
    const payload = {
      routeId,
      type,
      lat,
      lng,
      note,
      createdBy: userId,
      createdByName,
      createdAt: now,
      expiresAt: createDefaultExpiresAt(now),
      confirmedBy: [] as string[],
      clearedBy: [] as string[],
    }

    const created = await tools.create('alerts', payload)
    if (!created.success) {
      return { success: false, error: created.error || 'Failed to save alert.' }
    }

    return {
      success: true,
      data: { recordId: created.data?.recordId, alert: payload },
    }
  },

  voteAlert: async ({ userId, params, tools }) => {
    const alertId = typeof params.alertId === 'string' ? params.alertId.trim() : ''
    const vote = params.vote

    if (!alertId || (vote !== 'still_there' && vote !== 'cleared')) {
      return { success: false, error: 'Invalid alert vote request.' }
    }

    // shortcut: read-then-write spans two DO subrequests; move into a custom DO method if alert traffic exceeds several concurrent votes/sec on the same pin.
    const existing = await tools.get<Record<string, unknown>>('alerts', alertId)
    const recordData = existing.success ? (existing.data?.record?.data as Partial<HazardAlert> | undefined) : undefined
    if (!recordData || typeof recordData.expiresAt !== 'number') {
      return { success: false, error: 'Alert not found.' }
    }

    const now = Date.now()
    if (isAlertExpired({ expiresAt: recordData.expiresAt }, now)) {
      await tools.remove('alerts', alertId)
      return { success: false, error: 'Alert has already expired.' }
    }

    if (vote === 'still_there') {
      const next = applyStillThereVote(
        {
          expiresAt: recordData.expiresAt,
          confirmedBy: Array.isArray(recordData.confirmedBy) ? recordData.confirmedBy : [],
        },
        userId,
        now,
      )
      if (!next) {
        return { success: false, code: 'already_voted', error: 'You have already confirmed this alert.' }
      }

      const updated = await tools.update('alerts', alertId, {
        expiresAt: next.expiresAt,
        confirmedBy: next.confirmedBy,
      })
      if (!updated.success) {
        return { success: false, error: updated.error || 'Failed to update alert.' }
      }
      return { success: true, data: next }
    }

    const next = applyClearedVote(
      {
        expiresAt: recordData.expiresAt,
        clearedBy: Array.isArray(recordData.clearedBy) ? recordData.clearedBy : [],
      },
      userId,
      now,
    )
    if (!next) {
      return { success: false, code: 'already_voted', error: 'You have already marked this alert cleared.' }
    }

    if (next.shouldArchive) {
      const removed = await tools.remove('alerts', alertId)
      if (!removed.success) {
        return { success: false, error: removed.error || 'Failed to archive cleared alert.' }
      }
      return { success: true, data: next }
    }

    const updated = await tools.update('alerts', alertId, { clearedBy: next.clearedBy })
    if (!updated.success) {
      return { success: false, error: updated.error || 'Failed to record cleared vote.' }
    }
    return { success: true, data: next }
  },
}
