import type { CollectionSchema } from 'deepspace/schema'

export const alertsSchema: CollectionSchema = {
  name: 'alerts',
  columns: [
    { name: 'routeId', storage: 'text', interpretation: 'plain' },
    { name: 'type', storage: 'text', interpretation: 'plain' },
    { name: 'lat', storage: 'number', interpretation: 'plain' },
    { name: 'lng', storage: 'number', interpretation: 'plain' },
    { name: 'note', storage: 'text', interpretation: 'plain' },
    { name: 'createdBy', storage: 'text', interpretation: 'plain' },
    { name: 'createdByName', storage: 'text', interpretation: 'plain' },
    { name: 'createdAt', storage: 'number', interpretation: 'plain' },
    { name: 'expiresAt', storage: 'number', interpretation: 'plain' },
    { name: 'confirmedBy', storage: 'text', interpretation: 'json' },
    { name: 'clearedBy', storage: 'text', interpretation: 'json' },
  ],
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: true, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
