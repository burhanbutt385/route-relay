import { Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { RouteStop } from '../types/routerelay'

const stopIcon = L.divIcon({
  className: 'custom-stop-marker',
  html: `
    <div style="
      width: 14px;
      height: 14px;
      background: #ffffff;
      border: 3px solid #0284c7;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      cursor: pointer;
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

interface StopMarkerProps {
  stop: RouteStop
}

export function StopMarker({ stop }: StopMarkerProps) {
  return (
    <Marker position={[stop.lat, stop.lng]} icon={stopIcon}>
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <span className="font-semibold text-xs">{stop.name}</span>
      </Tooltip>
      <Popup>
        <div className="p-1 text-xs">
          <div className="font-bold text-sm text-foreground">{stop.name}</div>
          <div className="text-muted-foreground mt-0.5">Designated Corridor Stop</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">
            {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
