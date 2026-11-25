import type { CommuterRole, QuickStatusChip, RouteChatMessage } from '../types/routerelay'

export const COMMUTER_QUICK_CHIPS: QuickStatusChip[] = [
  { id: 'at-gate', label: 'At Main Gate', category: 'location', iconName: 'MapPin' },
  { id: 'leaving-5m', label: 'Leaving in 5m', category: 'departure', iconName: 'Clock' },
  { id: '2-seats', label: '2 Seats Available', category: 'carpool', iconName: 'Car', forRole: 'driver' },
  { id: 'heavy-traffic', label: 'Heavy Traffic Ahead', category: 'traffic', iconName: 'AlertTriangle' },
  { id: 'shuttle-arrived', label: 'Shuttle Just Arrived', category: 'departure', iconName: 'Bus' },
  { id: 'bus-full', label: 'Bus Full / Standing Only', category: 'general', iconName: 'Users', forRole: 'on_shuttle' },
  { id: 'waiting-at-stop', label: 'Waiting at Stop', category: 'location', iconName: 'Clock', forRole: 'waiting' },
  { id: 'passing-muridke', label: 'Passing Muridke', category: 'location', iconName: 'Navigation' },
]

export function getQuickChipsForRole(role?: CommuterRole): QuickStatusChip[] {
  return COMMUTER_QUICK_CHIPS.filter((chip) => !chip.forRole || chip.forRole === role)
}

export function getRouteChannelName(routeId: string): string {
  return `route-${routeId.toLowerCase().trim()}`
}

export function formatChatTimestamp(ms: number): string {
  const date = new Date(ms)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatChatRelativeTime(ms: number, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - ms) / 1000))
  if (diffSec < 45) return 'Just now'
  if (diffSec < 90) return '1m ago'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

export function getInitialRouteMessages(routeId: string): RouteChatMessage[] {
  const now = Date.now()
  switch (routeId) {
    case 'gt-road-grw-ksk':
      return [
        {
          id: 'grw-msg-1',
          routeId: 'gt-road-grw-ksk',
          authorId: 'commuter-usman',
          authorName: 'Usman R.',
          authorRole: 'driver',
          content: 'Leaving Chanda Qila bypass now. 2 seats available for UET KSK.',
          createdAt: now - 14 * 60 * 1000,
          isQuickChip: true,
          chipLabel: '2 Seats Available',
        },
        {
          id: 'grw-msg-2',
          routeId: 'gt-road-grw-ksk',
          authorId: 'commuter-zainab',
          authorName: 'Zainab A.',
          authorRole: 'waiting',
          content: 'Waiting at Kamoke Bus Stop. Has the 5 PM student shuttle passed?',
          createdAt: now - 8 * 60 * 1000,
          isQuickChip: true,
          chipLabel: 'Waiting at Stop',
        },
        {
          id: 'grw-msg-3',
          routeId: 'gt-road-grw-ksk',
          authorId: 'commuter-hamza',
          authorName: 'Hamza (Shuttle #3)',
          authorRole: 'on_shuttle',
          content: 'Shuttle #3 just crossed Muridke chowk. Approaching KSK in ~10 mins.',
          createdAt: now - 3 * 60 * 1000,
          isQuickChip: false,
        },
      ]
    case 'lahore-ksk-shuttle':
      return [
        {
          id: 'lhr-msg-1',
          routeId: 'lahore-ksk-shuttle',
          authorId: 'commuter-bilal',
          authorName: 'Bilal K.',
          authorRole: 'driver',
          content: 'Shahdara Metro Terminal is slow today. Leaving in 5m via flyover.',
          createdAt: now - 20 * 60 * 1000,
          isQuickChip: true,
          chipLabel: 'Leaving in 5m',
        },
        {
          id: 'lhr-msg-2',
          routeId: 'lahore-ksk-shuttle',
          authorId: 'commuter-drtariq',
          authorName: 'Dr. Tariq',
          authorRole: 'on_shuttle',
          content: 'Faculty coaster reached Ferozewala. Moving smoothly.',
          createdAt: now - 9 * 60 * 1000,
          isQuickChip: false,
        },
        {
          id: 'lhr-msg-3',
          routeId: 'lahore-ksk-shuttle',
          authorId: 'commuter-fatima',
          authorName: 'Fatima S.',
          authorRole: 'waiting',
          content: 'At Thokar pickup point, waiting for the evening shuttle.',
          createdAt: now - 2 * 60 * 1000,
          isQuickChip: true,
          chipLabel: 'At Main Gate',
        },
      ]
    case 'ksk-campus-loop':
      return [
        {
          id: 'loop-msg-1',
          routeId: 'ksk-campus-loop',
          authorId: 'commuter-aslam',
          authorName: 'Aslam (Loop Shuttle)',
          authorRole: 'driver',
          content: 'Campus shuttle starting loop from Main Gate towards CS Dept & Hostels.',
          createdAt: now - 11 * 60 * 1000,
          isQuickChip: true,
          chipLabel: 'Leaving in 5m',
        },
        {
          id: 'loop-msg-2',
          routeId: 'ksk-campus-loop',
          authorId: 'commuter-ali',
          authorName: 'Ali Raza',
          authorRole: 'waiting',
          content: 'At Central Library stop. Anyone heading to Main Gate?',
          createdAt: now - 5 * 60 * 1000,
          isQuickChip: true,
          chipLabel: 'Waiting at Stop',
        },
        {
          id: 'loop-msg-3',
          routeId: 'ksk-campus-loop',
          authorId: 'commuter-security',
          authorName: 'Campus Security',
          authorRole: 'on_shuttle',
          content: 'Sports Complex gate is open for evening practice.',
          createdAt: now - 1 * 60 * 1000,
          isQuickChip: false,
        },
      ]
    default:
      return []
  }
}
