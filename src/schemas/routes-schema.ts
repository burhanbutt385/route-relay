import type { CollectionSchema } from 'deepspace/schema'

export const routesSchema: CollectionSchema = {
  name: 'routes',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain' },
    { name: 'origin', storage: 'text', interpretation: 'plain' },
    { name: 'destination', storage: 'text', interpretation: 'plain' },
    { name: 'color', storage: 'text', interpretation: 'plain' },
    { name: 'waypoints', storage: 'text', interpretation: 'json' },
    { name: 'stops', storage: 'text', interpretation: 'json' },
  ],
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
