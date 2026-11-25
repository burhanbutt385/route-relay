import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { RouteRecord } from '../types/routerelay'
import { StopMarker } from './StopMarker'

export interface FocusTarget {
  coords: [number, number]
  seq: number
}

function MapBoundsFitter({ waypoints }: { waypoints: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (!waypoints || waypoints.length === 0) return
    const bounds = L.latLngBounds(waypoints)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true })
  }, [map, waypoints])

  return null
}

function MapCenterController({ focusTarget }: { focusTarget?: FocusTarget | null }) {
  const map = useMap()

  useEffect(() => {
    if (focusTarget) {
      map.flyTo(focusTarget.coords, 14, { animate: true, duration: 1.2 })
    }
  }, [map, focusTarget])

  return null
}

function MapClickHandler({ onMapClick }: { onMapClick?: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

interface MapCanvasProps {
  activeRoute: RouteRecord
  focusTarget?: FocusTarget | null
  onMapClick?: (coords: [number, number]) => void
  children?: React.ReactNode
}

export function MapCanvas({
  activeRoute,
  focusTarget,
  onMapClick,
  children,
}: MapCanvasProps) {
  const center = activeRoute.waypoints[0] || [31.7552, 74.2995]

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ minHeight: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsFitter waypoints={activeRoute.waypoints} />
        <MapCenterController focusTarget={focusTarget} />
        <MapClickHandler onMapClick={onMapClick} />

        {/* Corridor Polyline Outer Glow / Border */}
        <Polyline
          positions={activeRoute.waypoints}
          pathOptions={{
            color: '#ffffff',
            weight: 8,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />

        {/* Corridor Polyline Core */}
        <Polyline
          positions={activeRoute.waypoints}
          pathOptions={{
            color: activeRoute.color,
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />

        {/* Named Corridor Stops */}
        {activeRoute.stops.map((stop) => (
          <StopMarker key={stop.id} stop={stop} />
        ))}

        {children}
      </MapContainer>
    </div>
  )
}
