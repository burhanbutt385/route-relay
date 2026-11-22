import { useState, useEffect } from 'react'
import {
  Modal,
} from './ui/Modal'
import { Button } from './ui/Button'
import type { AlertType, RouteRecord } from '../types/routerelay'
import { ALERT_TYPE_CONFIGS } from '../lib/alerts'
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  OctagonAlert,
  MapPin,
  Clock,
  Radio,
  Crosshair,
} from 'lucide-react'

interface DropAlertModalProps {
  open: boolean
  onClose: () => void
  activeRoute: RouteRecord
  initialCoords: [number, number]
  userCurrentCoords?: [number, number] | null
  onSubmitAlert: (alertData: {
    type: AlertType
    lat: number
    lng: number
    note: string
  }) => Promise<void>
}

export function DropAlertModal({
  open,
  onClose,
  activeRoute,
  initialCoords,
  userCurrentCoords,
  onSubmitAlert,
}: DropAlertModalProps) {
  const [selectedType, setSelectedType] = useState<AlertType>('traffic')
  const [note, setNote] = useState<string>('')
  const [coords, setCoords] = useState<[number, number]>(initialCoords)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Update coords whenever initialCoords changes when opened
  useEffect(() => {
    if (open) {
      setCoords(initialCoords)
      setErrorMsg(null)
    }
  }, [open, initialCoords])

  const handleSnapToMyLocation = () => {
    if (userCurrentCoords) {
      setCoords(userCurrentCoords)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      setErrorMsg('Please enter a brief description (e.g. checkpoint delay, traffic jam).')
      return
    }
    if (note.length > 120) {
      setErrorMsg('Note cannot exceed 120 characters.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      await onSubmitAlert({
        type: selectedType,
        lat: coords[0],
        lng: coords[1],
        note: note.trim(),
      })
      setNote('')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to broadcast alert. Please try again.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const alertTypes: { type: AlertType; icon: React.ReactNode }[] = [
    {
      type: 'traffic',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    },
    {
      type: 'checkpoint',
      icon: <ShieldAlert className="w-4 h-4 text-blue-500" />,
    },
    {
      type: 'shuttle_full',
      icon: <Users className="w-4 h-4 text-purple-500" />,
    },
    {
      type: 'roadblock',
      icon: <OctagonAlert className="w-4 h-4 text-red-500" />,
    },
  ]

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <Modal.Title>Report Corridor Hazard</Modal.Title>
            <p className="text-xs text-muted-foreground mt-0.5">
              Broadcasts a 30-minute decaying alert to all commuters along{' '}
              <span className="font-semibold text-foreground">{activeRoute.name}</span>
            </p>
          </div>
        </div>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Alert Type Selector Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Hazard Type</label>
            <div className="grid grid-cols-2 gap-2">
              {alertTypes.map(({ type, icon }) => {
                const config = ALERT_TYPE_CONFIGS[type]
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `border-primary bg-primary/10 shadow-xs ring-1 ring-primary`
                        : 'border-border bg-card/60 hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-foreground">{config.label}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {config.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Short Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="alert-note" className="text-xs font-semibold text-foreground">
                Situation Note
              </label>
              <span
                className={`text-[10px] font-mono ${
                  note.length > 100 ? 'text-amber-500 font-bold' : 'text-muted-foreground'
                }`}
              >
                {note.length}/120
              </span>
            </div>
            <textarea
              id="alert-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              placeholder="e.g. Police document check near toll plaza. 1 lane open, 10 min delay..."
              rows={3}
              required
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Coordinates & Snap to Location */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Pin Location
              </span>
              {userCurrentCoords && (
                <button
                  type="button"
                  onClick={handleSnapToMyLocation}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Crosshair className="w-3 h-3" />
                  Snap to My Current Location
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span>Lat: {coords[0].toFixed(5)}</span>
              <span>•</span>
              <span>Lng: {coords[1].toFixed(5)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              Tip: You can also click directly anywhere on the map canvas to set this pin.
            </p>
          </div>

          {/* TTL Guarantee Notice */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-sky-500/5 border border-sky-500/20 p-2.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Initial lifespan is <strong>30 minutes</strong>. Fellow commuters can extend (+15m) or
              mark cleared.
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !note.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Alert (30m)'}</span>
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
