import { buildCronContext, type CronTask } from 'deepspace/worker'
import type { Env } from '../worker'
import { isAlertExpired } from './lib/alerts'

const PRUNE_BATCH_LIMIT = 500

export const tasks: CronTask[] = [
  { name: 'prune-expired-alerts', intervalMinutes: 60 },
]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name !== 'prune-expired-alerts') return

  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  const rows = (await ctx.records.query('alerts', { limit: PRUNE_BATCH_LIMIT })) as Array<{
    recordId?: string
    data?: { expiresAt?: number }
  }>

  const now = Date.now()
  for (const row of rows) {
    if (
      row.recordId &&
      typeof row.data?.expiresAt === 'number' &&
      isAlertExpired({ expiresAt: row.data.expiresAt }, now)
    ) {
      await ctx.records.delete('alerts', row.recordId)
    }
  }
}
