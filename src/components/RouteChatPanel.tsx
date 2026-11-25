import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useMessages, useUser, isWriterRole } from 'deepspace'
import { useChatChannel } from './messaging/hooks/useChatChannel'
import type { RouteRecord, CommuterPresence, RouteChatMessage } from '../types/routerelay'
import {
  COMMUTER_QUICK_CHIPS,
  getQuickChipsForRole,
  getRouteChannelName,
  formatChatRelativeTime,
  getInitialRouteMessages,
} from '../lib/routeChat'
import {
  Send,
  MapPin,
  Clock,
  Car,
  AlertTriangle,
  Bus,
  Users,
  Navigation,
  MessageSquare,
  Sparkles,
  Radio,
  CheckCircle2,
} from 'lucide-react'

interface RouteChatPanelProps {
  activeRoute: RouteRecord
  myPresence: CommuterPresence
  onBroadcastStatus?: (statusText: string) => void
  className?: string
}

function getChipIcon(iconName?: string) {
  switch (iconName) {
    case 'MapPin':
      return <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
    case 'Clock':
      return <Clock className="w-3 h-3 text-amber-400 shrink-0" />
    case 'Car':
      return <Car className="w-3 h-3 text-emerald-400 shrink-0" />
    case 'AlertTriangle':
      return <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
    case 'Bus':
      return <Bus className="w-3 h-3 text-indigo-400 shrink-0" />
    case 'Users':
      return <Users className="w-3 h-3 text-teal-400 shrink-0" />
    case 'Navigation':
      return <Navigation className="w-3 h-3 text-blue-400 shrink-0" />
    default:
      return <MapPin className="w-3 h-3 text-primary shrink-0" />
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'driver':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Car className="w-2.5 h-2.5" /> Driver
        </span>
      )
    case 'on_shuttle':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <Bus className="w-2.5 h-2.5" /> Rider
        </span>
      )
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-2.5 h-2.5" /> Waiting
        </span>
      )
    default:
      return null
  }
}

export function RouteChatPanel({
  activeRoute,
  myPresence,
  onBroadcastStatus,
  className = '',
}: RouteChatPanelProps) {
  const channelName = useMemo(() => getRouteChannelName(activeRoute.id), [activeRoute.id])
  const { channelId, status: channelStatus } = useChatChannel(channelName)
  const { messages: serverMessages, send: sendServerMessage } = useMessages(channelId)
  const { user } = useUser()
  const canWrite = isWriterRole(user?.role)

  const [inputVal, setInputVal] = useState('')
  const [justSentChipId, setJustSentChipId] = useState<string | null>(null)

  // Local optimistic message store for responsive multi-user simulation & seeded feeds
  const [localMessages, setLocalMessages] = useState<RouteChatMessage[]>(() =>
    getInitialRouteMessages(activeRoute.id)
  )

  // Rapid route switching hardening: switch corridor messages cleanly on route change
  useEffect(() => {
    setLocalMessages(getInitialRouteMessages(activeRoute.id))
    setInputVal('')
    setJustSentChipId(null)
  }, [activeRoute.id])

  // Merge server records with local/seeded messages
  const displayMessages = useMemo(() => {
    const map = new Map<string, RouteChatMessage>()

    // Seed/optimistic first
    for (const msg of localMessages) {
      if (msg.routeId === activeRoute.id) {
        map.set(msg.id, msg)
      }
    }

    // Overlay synced DeepSpace messages
    if (serverMessages && serverMessages.length > 0) {
      for (const rec of serverMessages) {
        if (!rec.data.deleted) {
          const content = rec.data.content || ''
          const isQuick = content.startsWith('⚡ [Status] ')
          const cleanContent = isQuick ? content.replace('⚡ [Status] ', '') : content

          map.set(rec.recordId, {
            id: rec.recordId,
            routeId: activeRoute.id,
            channelId: rec.data.channelId,
            authorId: rec.data.authorId || rec.createdBy || 'anonymous',
            authorName: rec.createdBy === myPresence.userId ? myPresence.displayName : 'Commuter',
            authorRole: rec.createdBy === myPresence.userId ? myPresence.role : 'on_shuttle',
            content: cleanContent,
            createdAt: new Date(rec.createdAt).getTime(),
            isQuickChip: isQuick,
            chipLabel: isQuick ? cleanContent : undefined,
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt)
  }, [serverMessages, localMessages, activeRoute.id, myPresence])

  // Auto-scroll to bottom of feed
  const feedEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = useCallback(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages.length, scrollToBottom])

  // Send message handler (works with free-form text or 1-tap quick status chips)
  const handleSendMessage = async (text: string, isChip = false, chipLabel?: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const newMsg: RouteChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      routeId: activeRoute.id,
      channelId,
      authorId: myPresence.userId,
      authorName: myPresence.displayName,
      authorRole: myPresence.role,
      content: trimmed,
      createdAt: Date.now(),
      isQuickChip: isChip,
      chipLabel: chipLabel || (isChip ? trimmed : undefined),
    }

    // 1. Broadcast status note to Presence layer (so markers on Leaflet map reflect it live!)
    if (onBroadcastStatus) {
      onBroadcastStatus(trimmed)
    }

    // 2. Persist to DeepSpace Channel Collection when writable; fall back to local state for guests
    let persistedToChannel = false
    if (channelId && canWrite && sendServerMessage) {
      try {
        const payload = isChip ? `⚡ [Status] ${trimmed}` : trimmed
        const sentId = await sendServerMessage(payload)
        persistedToChannel = Boolean(sentId)
      } catch {
        persistedToChannel = false
      }
    }

    if (!persistedToChannel) {
      setLocalMessages((prev) => [...prev, newMsg])
    }

    setInputVal('')
    setTimeout(scrollToBottom, 50)
  }

  // 1-Tap Quick Chip Dispatch
  const handleTapChip = (chip: (typeof COMMUTER_QUICK_CHIPS)[0]) => {
    setJustSentChipId(chip.id)
    setTimeout(() => setJustSentChipId(null), 1200)
    handleSendMessage(chip.label, true, chip.label)
  }

  const roleChips = useMemo(() => getQuickChipsForRole(myPresence.role), [myPresence.role])

  return (
    <div
      className={`flex flex-col h-full bg-card/60 backdrop-blur-md overflow-hidden ${className}`}
      data-testid="route-chat-panel"
    >
      {/* Route Channel Header */}
      <div className="px-3.5 py-2.5 border-b border-border bg-muted/30 shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <h3 className="text-xs font-bold text-foreground truncate">
              {activeRoute.name.split(':')[0]} Live Feed
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {activeRoute.origin} ↔ {activeRoute.destination}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              channelId && canWrite && channelStatus === 'ready'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
            title={
              channelId && canWrite && channelStatus === 'ready'
                ? 'Synced across tabs via DeepSpace Channel'
                : 'Local corridor preview — sign in to sync chat across sessions'
            }
          >
            {channelId && canWrite && channelStatus === 'ready' ? 'Live' : 'Demo'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {displayMessages.length} msgs
          </span>
        </div>
      </div>

      {/* One-Tap Commuter Quick Chips Bar */}
      <div className="px-3 py-2 border-b border-border/60 bg-muted/20 shrink-0 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" /> 1-Tap Quick Status
          </span>
          <span className="text-[9px] text-muted-foreground/80 lowercase">taps post instantly</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {roleChips.map((chip) => {
            const isSent = justSentChipId === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleTapChip(chip)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border shrink-0 shadow-xs ${
                  isSent
                    ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 scale-95'
                    : 'bg-card/80 hover:bg-muted border-border hover:border-primary/40 text-foreground'
                }`}
                title={`One-tap send "${chip.label}"`}
              >
                {isSent ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : getChipIcon(chip.iconName)}
                <span>{chip.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Messages Scroll Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {displayMessages.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
            <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <p className="font-medium text-foreground">No updates along this corridor yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Tap any status chip above or send a message to coordinate with fellow riders and drivers.
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isSelf = msg.authorId === myPresence.userId
            return (
              <div
                key={msg.id}
                className={`flex flex-col text-xs transition-all ${
                  isSelf ? 'items-end' : 'items-start'
                }`}
              >
                {/* Meta line */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{msg.authorName}</span>
                  {isSelf && <span className="text-sky-400 font-bold">(You)</span>}
                  {getRoleBadge(msg.authorRole)}
                  <span>· {formatChatRelativeTime(msg.createdAt)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                    msg.isQuickChip
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-tr-sm'
                      : isSelf
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.isQuickChip && (
                    <div className="text-[9px] uppercase font-bold text-amber-400/90 tracking-wider flex items-center gap-1 mb-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Quick Status
                    </div>
                  )}
                  <p className="break-words font-medium">{msg.content}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Message Composer Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage(inputVal, false)
        }}
        className="p-2.5 border-t border-border bg-card/80 shrink-0 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Message commuters on ${activeRoute.name.split(':')[0]}...`}
          className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
