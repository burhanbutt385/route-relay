export interface RouteStop {
  id: string
  name: string
  lat: number
  lng: number
}

export interface RouteRecord {
  id: string
  name: string
  origin: string
  destination: string
  color: string
  waypoints: [number, number][]
  stops: RouteStop[]
}

export type AlertType = 'traffic' | 'checkpoint' | 'shuttle_full' | 'roadblock'

export interface HazardAlert {
  id: string
  routeId: string
  type: AlertType
  lat: number
  lng: number
  note: string
  createdBy: string
  createdByName: string
  createdAt: number
  expiresAt: number
  confirmedBy: string[]
  clearedBy: string[]
}

export type CommuterRole = 'waiting' | 'on_shuttle' | 'driver'

export interface CommuterPresence {
  userId: string
  displayName: string
  routeId: string
  role: CommuterRole
  lat: number
  lng: number
  isSimulated: boolean
  updatedAt: number
  heading?: number
  speedKmh?: number
  statusNote?: string
}

export interface RouteChatMessage {
  id: string
  routeId: string
  channelId?: string
  authorId: string
  authorName: string
  authorRole: CommuterRole
  content: string
  createdAt: number
  isQuickChip?: boolean
  chipLabel?: string
}

export interface QuickStatusChip {
  id: string
  label: string
  category: 'location' | 'departure' | 'carpool' | 'traffic' | 'general'
  iconName?: string
  forRole?: CommuterRole
}
