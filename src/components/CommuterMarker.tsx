import { useMemo } from 'react'
import { Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { CommuterPresence, CommuterRole } from '../types/routerelay'

interface CommuterMarkerProps {
  commuter: CommuterPresence
  isSelf?: boolean
}

function getRoleColor(role: CommuterRole): string {
  switch (role) {
    case 'on_shuttle':
      return '#0284c7' // sky-600
    case 'driver':
      return '#059669' // emerald-600
    case 'waiting':
      return '#d97706' // amber-600
    default:
      return '#64748b' // slate-500
  }
}

function getRoleLabel(role: CommuterRole): string {
  switch (role) {
    case 'on_shuttle':
      return 'Shuttle Rider'
    case 'driver':
      return 'Carpool Driver'
    case 'waiting':
      return 'Waiting at Stop'
    default:
      return 'Commuter'
  }
}

function getRoleIconSvg(role: CommuterRole): string {
  switch (role) {
    case 'on_shuttle':
      // Bus icon
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`
    case 'driver':
      // Car icon
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
    case 'waiting':
      // Clock / User icon
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  }
}

export function CommuterMarker({ commuter, isSelf = false }: CommuterMarkerProps) {
  const color = getRoleColor(commuter.role)
  const roleLabel = getRoleLabel(commuter.role)
  const iconSvg = getRoleIconSvg(commuter.role)
  const heading = commuter.heading || 0

  const markerIcon = useMemo(() => {
    const pulseRing = isSelf
      ? `<div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.35;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>`
      : ''

    const headingArrow =
      commuter.speedKmh && commuter.speedKmh > 0
        ? `<div style="
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%) rotate(${heading}deg);
            transform-origin: 50% 18px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 7px solid ${color};
          "></div>`
        : ''

    const selfTag = isSelf
      ? `<div style="
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #38bdf8;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          border: 1px solid #38bdf8;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
        ">YOU</div>`
      : ''

    return L.divIcon({
      className: 'routerelay-commuter-marker',
      html: `
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          ${pulseRing}
          ${headingArrow}
          <div style="
            position: relative;
            width: 26px;
            height: 26px;
            background: #ffffff;
            border: 2.5px solid ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color};
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">
            ${iconSvg}
          </div>
          ${selfTag}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    })
  }, [color, iconSvg, isSelf, heading, commuter.speedKmh])

  return (
    <Marker position={[commuter.lat, commuter.lng]} icon={markerIcon}>
      <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 font-medium text-xs">
            <span>{commuter.displayName}</span>
            {isSelf && <span className="text-[10px] text-sky-500 font-bold">(You)</span>}
            <span className="text-[10px] text-muted-foreground">• {roleLabel}</span>
            {commuter.isSimulated && (
              <span className="bg-purple-500/20 text-purple-400 text-[9px] font-bold px-1 rounded">
                SIM
              </span>
            )}
          </div>
          {commuter.statusNote && (
            <div className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
              <span>💬</span>
              <span>"{commuter.statusNote}"</span>
            </div>
          )}
        </div>
      </Tooltip>
      <Popup>
        <div className="p-1 text-xs space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
            <span className="font-bold text-foreground text-sm flex items-center gap-1">
              {commuter.displayName}
              {isSelf && <span className="text-xs text-sky-500 font-semibold">(You)</span>}
            </span>
            {commuter.isSimulated ? (
              <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30">
                Simulated
              </span>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                Live GPS
              </span>
            )}
          </div>

          {commuter.statusNote && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-md p-1.5 text-xs text-sky-300 font-medium">
              <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">Latest Status:</span>
              "{commuter.statusNote}"
            </div>
          )}

          <div className="space-y-0.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Role:</span>
              <span className="font-semibold text-foreground">{roleLabel}</span>
            </div>
            {typeof commuter.speedKmh === 'number' && (
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="font-semibold text-foreground">
                  {commuter.speedKmh > 0 ? `${Math.round(commuter.speedKmh)} km/h` : 'Stationary'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="font-mono text-[10px] text-foreground">
                {commuter.lat.toFixed(4)}, {commuter.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
