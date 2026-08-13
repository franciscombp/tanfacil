import { useEffect, useRef, useState } from 'react'
import { Clock3, Crown, Lightbulb, LogOut, Wifi, WifiOff } from 'lucide-react'

import { useGame } from '@/game/useGame'
import type { RoomRole } from '@/realtime/useRoom'
import { storyClock } from '@/engine/story'
import { pauseUpdates } from '@/lib/useAppVersion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Stage } from './Stage'
import { OptionsGrid } from './OptionsGrid'
import { VoteStatusBar } from './VoteStatusBar'
import { EvidenceDrawer } from './EvidenceDrawer'
import { SummaryPanel } from './SummaryPanel'
import { AdminDock } from './AdminDock'

/**
 * La vista de la partida, idéntica para jugadores y anfitrión: el admin la
 * proyecta tal cual y sus controles viven en un dock flotante aparte.
 * Prioridad visual: la imagen y las acciones; todo lo demás es secundario.
 */
export function GameView({
  role,
  name,
  onExit,
}: {
  role: RoomRole
  name: string
  onExit: () => void
}) {
  const game = useGame(name, role)
  const { story, scene, status, admin, elapsedSeconds, pastDeadline, lastCard, phase } =
    game

  // No recargar por actualización mientras se está jugando.
  useEffect(() => {
    pauseUpdates(true)
    return () => pauseUpdates(false)
  }, [])

  // Cortinilla entre escenas: el cambio no debe ser un corte seco.
  const [changing, setChanging] = useState(false)
  const previousScene = useRef<string | null>(null)
  const sceneId = scene?.id ?? null
  useEffect(() => {
    if (!sceneId) return
    if (previousScene.current && previousScene.current !== sceneId) {
      setChanging(true)
      const timer = setTimeout(() => setChanging(false), 900)
      previousScene.current = sceneId
      return () => clearTimeout(timer)
    }
    previousScene.current = sceneId
  }, [sceneId])

  if (!scene) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const isEnding = scene.type === 'ending'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* CORTINILLA ENTRE ESCENAS */}
      {changing && (
        <div
          key={scene.id}
          className="pointer-events-none fixed inset-0 z-50 grid animate-curtain place-items-center bg-background"
        >
          <p className="animate-pulse-soft text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {scene.detour ? 'Consecuencia' : isEnding ? 'Desenlace' : 'Siguiente paso'}
          </p>
        </div>
      )}

      {/* BARRA SUPERIOR, mínima */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <Badge
          variant="secondary"
          className="font-mono"
          title="La hora de la historia. No hay penalización por pasar de las 12:00."
        >
          <Clock3 /> {storyClock(story, elapsedSeconds)}
        </Badge>
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">
          {pastDeadline
            ? 'Son más de las 12:00 y no ha entrado nadie'
            : story.premise}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={
              status === 'connected'
                ? 'Sincronizado con la sala'
                : status === 'connecting'
                  ? 'Reconectando…'
                  : 'Sin conexión en vivo'
            }
          >
            {status === 'connected' ? (
              <Wifi className="size-3.5 text-emerald-500" />
            ) : (
              <WifiOff
                className={
                  status === 'offline'
                    ? 'size-3.5 text-destructive'
                    : 'size-3.5 animate-pulse-soft text-amber-500'
                }
              />
            )}
          </span>
          <Badge
            variant={admin ? 'secondary' : 'outline'}
            title={admin ? 'Hay anfitrión dirigiendo' : 'Sin anfitrión conectado'}
          >
            <Crown />
          </Badge>
          <Button variant="ghost" size="sm" onClick={onExit}>
            <LogOut />
          </Button>
        </div>
      </header>

      {status === 'offline' && (
        <div className="shrink-0 border-b bg-destructive/10 px-4 py-1.5 text-center text-xs text-destructive">
          Sin conexión en vivo: no verás a otros jugadores ni se sincronizará la partida.
        </div>
      )}

      {/* IMAGEN + ACCIONES: el centro de la pantalla */}
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,hsl(var(--background))_65%)]"
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col items-center gap-5 px-4 py-6">
          <Stage scene={scene} />

          {/* Nueva pista: alimenta la discusión antes de la siguiente votación */}
          {lastCard && !isEnding && phase === 'voting' && (
            <div className="w-full max-w-2xl animate-fade-up rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="size-3.5" /> Nueva pista · {lastCard.slot}
              </p>
              <p className="mt-1 text-sm">{lastCard.text}</p>
              {lastCard.noise && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Es lo que alguien recuerda, no una prueba.
                </p>
              )}
            </div>
          )}

          {isEnding ? <SummaryPanel game={game} /> : <OptionsGrid game={game} />}

          {/* Lo secundario, al fondo y compacto */}
          {!isEnding && (
            <div className="mt-auto flex w-full flex-col gap-3 pt-2">
              <VoteStatusBar game={game} />
              <EvidenceDrawer game={game} />
            </div>
          )}
        </div>
      </main>

      {role === 'admin' && <AdminDock game={game} />}
    </div>
  )
}
