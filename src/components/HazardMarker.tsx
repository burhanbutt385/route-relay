import { useMemo } from 'react'
import { Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { HazardAlert } from '../types/routerelay'
import {
  ALERT_TYPE_CONFIGS,
  formatTimeRemaining,
  formatRelativeTime,
} from '../lib/alerts'
import { ThumbsUp, CheckCircle, Clock, MapPin, User } from 'lucide-react'

interface HazardMarkerProps {
  alert: HazardAlert
  currentUserId: string
  now: number
  onVoteStillThere: (alert: HazardAlert) => void
  onVoteCleared: (alert: HazardAlert) => void
}

function getAlertIconSvg(type: HazardAlert['type']): string {
  switch (type) {
    case 'traffic':
      // Traffic Cone / Warning Triangle
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    case 'checkpoint':
      // Shield Alert
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    case 'shuttle_full':
      // Bus / Users
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    case 'roadblock':
      // Octagon / Stop
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  }
}

export function HazardMarker({
  alert,
  currentUserId,
  now,
  onVoteStillThere,
  onVoteCleared,
}: HazardMarkerProps) {
  const config = ALERT_TYPE_CONFIGS[alert.type] || ALERT_TYPE_CONFIGS.traffic
  const timeRemaining = formatTimeRemaining(alert.expiresAt, now)
  const relativeTime = formatRelativeTime(alert.createdAt, now)

  const confirmedList = Array.isArray(alert.confirmedBy) ? alert.confirmedBy : []
  const clearedList = Array.isArray(alert.clearedBy) ? alert.clearedBy : []

  const hasVotedStillThere = confirmedList.includes(currentUserId)
  const hasVotedCleared = clearedList.includes(currentUserId)
  const isExpired = now >= alert.expiresAt

  const markerIcon = useMemo(() => {
    const iconSvg = getAlertIconSvg(alert.type)
    const color = config.color

    return L.divIcon({
      className: 'custom-hazard-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; cursor: pointer;">
          <!-- Pulsing Beacon Wave -->
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.35;
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>

          <!-- Countdown Badge on Top -->
          <div style="
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: ${color};
            font-size: 9px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 9999px;
            border: 1.5px solid ${color};
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            letter-spacing: 0.3px;
          ">
            ${timeRemaining}
          </div>

          <!-- Main Icon Disc -->
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${color};
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          ">
            ${iconSvg}
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -22],
    })
  }, [alert.type, alert.expiresAt, config.color, timeRemaining])

  return (
    <Marker position={[alert.lat, alert.lng]} icon={markerIcon}>
      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
        <div className="text-center font-sans">
          <span className="font-bold text-xs">{config.label}</span>
          <span className="block text-[10px] text-muted-foreground">{timeRemaining}</span>
        </div>
      </Tooltip>

      <Popup minWidth={280} maxWidth={320} className="custom-hazard-popup">
        <div className="p-1 space-y-3 font-sans text-xs">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
            <div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${config.bgClass}`}
              >
                {config.label}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                <User className="w-3 h-3" />
                <span>{alert.createdByName || 'Anonymous Commuter'}</span>
                <span>·</span>
                <span>{relativeTime}</span>
              </div>
            </div>

            {/* Live Countdown Pill */}
            <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-muted/80 text-foreground border border-border shrink-0">
              <Clock className="w-3 h-3 text-primary" />
              <span>{timeRemaining}</span>
            </div>
          </div>

          {/* Hazard Note */}
          <p className="text-sm font-medium text-foreground leading-snug break-words">
            "{alert.note}"
          </p>

          {/* Location details */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span>
              {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
            </span>
          </div>

          {/* Community Verification Actions */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Community Verification</span>
              <span>{clearedList.length}/2 Cleared Votes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Still There (+15m) Button */}
              <button
                type="button"
                onClick={() => onVoteStillThere(alert)}
                disabled={hasVotedStillThere || isExpired}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs transition-all ${
                  hasVotedStillThere
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                    : isExpired
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                }`}
                title={
                  hasVotedStillThere
                    ? 'You have already confirmed this alert'
                    : 'Extend alert duration by 15 minutes'
                }
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>
                  {hasVotedStillThere
                    ? `Confirmed (${confirmedList.length})`
                    : `Still There (+15m) ${confirmedList.length > 0 ? `(${confirmedList.length})` : ''}`}
                </span>
              </button>

              {/* Cleared Button */}
              <button
                type="button"
                onClick={() => onVoteCleared(alert)}
                disabled={hasVotedCleared || isExpired}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs border transition-all ${
                  hasVotedCleared
                    ? 'bg-muted/80 text-muted-foreground border-border cursor-default'
                    : isExpired
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-border'
                      : 'bg-card hover:bg-muted/60 text-foreground border-border hover:border-foreground/30 shadow-xs'
                }`}
                title={
                  hasVotedCleared
                    ? 'You have marked this cleared'
                    : '2 votes automatically archives this alert'
                }
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {hasVotedCleared ? 'Marked Cleared' : `Cleared (${clearedList.length}/2)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
