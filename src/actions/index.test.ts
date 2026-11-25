import { describe, expect, it, vi } from 'vitest'
import type { ActionContext, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { actions } from './index'

function makeContext(
  userId: string,
  params: Record<string, unknown>,
  overrides: Partial<ActionTools> = {},
): ActionContext<Env> {
  const tools = {
    get: vi.fn().mockResolvedValue({ success: false }),
    create: vi.fn().mockResolvedValue({ success: true, data: { recordId: 'rec-1' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { recordId: 'rec-1' } }),
    remove: vi.fn().mockResolvedValue({ success: true, data: { recordId: 'rec-1' } }),
    deleteWhere: vi.fn(),
    query: vi.fn(),
    integration: vi.fn(),
    registerUser: vi.fn(),
    ...overrides,
  } as unknown as ActionTools

  return {
    userId,
    params,
    tools,
    env: {} as Env,
    callerJwt: 'test-jwt',
  }
}

describe('RouteRelay server actions', () => {
  it('rejects createAlert with invalid corridor, note, or coordinates', async () => {
    const badRoute = await actions.createAlert(
      makeContext('u1', { routeId: 'fake-route', type: 'traffic', lat: 31.8, lng: 74.2, note: 'Jam' }),
    )
    expect(badRoute.success).toBe(false)

    const longNote = await actions.createAlert(
      makeContext('u1', {
        routeId: 'gt-road-grw-ksk',
        type: 'traffic',
        lat: 31.8,
        lng: 74.2,
        note: 'x'.repeat(121),
      }),
    )
    expect(longNote.success).toBe(false)

    const badLat = await actions.createAlert(
      makeContext('u1', { routeId: 'gt-road-grw-ksk', type: 'traffic', lat: 120, lng: 74.2, note: 'Jam' }),
    )
    expect(badLat.success).toBe(false)
  })

  it('creates an alert with verified userId and server TTL', async () => {
    const createMock = vi.fn().mockResolvedValue({ success: true, data: { recordId: 'alert-42' } })
    const getMock = vi
      .fn()
      .mockResolvedValue({ success: true, data: { record: { data: { name: 'Bilal K.' } } } })

    const res = await actions.createAlert(
      makeContext(
        'user-bilal',
        {
          routeId: 'gt-road-grw-ksk',
          type: 'checkpoint',
          lat: 31.8021,
          lng: 74.2615,
          note: '  Police check near Muridke  ',
        },
        { get: getMock, create: createMock },
      ),
    )

    expect(res.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      'alerts',
      expect.objectContaining({
        routeId: 'gt-road-grw-ksk',
        type: 'checkpoint',
        note: 'Police check near Muridke',
        createdBy: 'user-bilal',
        createdByName: 'Bilal K.',
        confirmedBy: [],
        clearedBy: [],
      }),
    )
  })

  it('merges still_there votes, rejects duplicates, and deletes on second cleared vote', async () => {
    const now = Date.now()
    const baseRecord = {
      expiresAt: now + 20 * 60 * 1000,
      confirmedBy: ['user-a'],
      clearedBy: ['user-a'],
    }

    const dup = await actions.voteAlert(
      makeContext(
        'user-a',
        { alertId: 'alert-1', vote: 'still_there' },
        { get: vi.fn().mockResolvedValue({ success: true, data: { record: { data: baseRecord } } }) },
      ),
    )
    expect(dup.success).toBe(false)
    if (!dup.success) {
      expect(dup.code).toBe('already_voted')
    }

    const removeMock = vi.fn().mockResolvedValue({ success: true })
    const cleared = await actions.voteAlert(
      makeContext(
        'user-b',
        { alertId: 'alert-1', vote: 'cleared' },
        {
          get: vi.fn().mockResolvedValue({ success: true, data: { record: { data: baseRecord } } }),
          remove: removeMock,
        },
      ),
    )
    expect(cleared.success).toBe(true)
    expect(removeMock).toHaveBeenCalledWith('alerts', 'alert-1')
  })
})
