import { useEffect, useRef, useState } from 'react'
import { Clock3, Crown, LogOut, Wifi, WifiOff } from 'lucide-react'

import { useGame } from '@/game/useGame'
import type { RoomRole } from '@/realtime/useRoom'
import { storyClock } from '@/engine/story'
import { pauseUpdates } from '@/lib/useAppVersion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Stage } from './Stage'
import { SceneNarration } from './SceneNarration'
import { OptionsGrid } from './OptionsGrid'
import { VoteStatusBar } from './VoteStatusBar'
import { MemoryPanel } from './MemoryPanel'
import { SummaryPanel } from './SummaryPanel'
import { WaitingRoom } from './WaitingRoom'
import { AdminDock } from './AdminDock'

/**
 * La vista de la partida, idéntica para jugadores y facilitador: el admin la
 * proyecta tal cual y sus controles viven en un dock flotante aparte.
 *
 * Jerarquía: la imagen manda (columna izquierda), el relato la acompaña a la
 * derecha con la memoria debajo, y las acciones ocupan una franja propia al
 * pie, en dos columnas. Nada queda bajo el pliegue.
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
  const { story, scene, status, admin, waiting, elapsedSeconds, pastDeadline } = game

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

  // Las 12:00 llegan y no pasa nada: se cuenta una sola vez, sin bloquear.
  const [noonNotice, setNoonNotice] = useState(false)
  const noonShownRef = useRef(false)
  useEffect(() => {
    if (!pastDeadline || noonShownRef.current) return
    noonShownRef.current = true
    setNoonNotice(true)
    const timer = setTimeout(() => setNoonNotice(false), 9000)
    return () => clearTimeout(timer)
  }, [pastDeadline])

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
            {scene.type === 'detour'
              ? 'Consecuencia'
              : isEnding
                ? 'Desenlace'
                : 'Siguiente paso'}
          </p>
        </div>
      )}

      {/* LAS 12:00, sin drama */}
      {noonNotice && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <p className="max-w-md animate-fade-up whitespace-pre-line rounded-lg border bg-card/95 px-5 py-3 text-center text-sm shadow-xl">
            {story.noon}
          </p>
        </div>
      )}

      {/* BARRA SUPERIOR, mínima */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
        {waiting ? (
          <Badge variant="outline" className="uppercase tracking-wide">
            Sala de espera
          </Badge>
        ) : (
          <>
            <Badge
              variant="secondary"
              className="font-mono"
              title="La hora de la historia. Pasar de las 12:00 no penaliza nada."
            >
              <Clock3 /> {storyClock(story, elapsedSeconds)}
            </Badge>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {pastDeadline ? 'Son más de las 12:00 y el jefe no aparece' : story.premise}
            </span>
          </>
        )}

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
            title={admin ? 'Hay facilitador conectado' : 'Sin facilitador conectado'}
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

      {waiting ? (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <WaitingRoom game={game} />
        </main>
      ) : (
        <>
          {/* ESCENA: imagen a la izquierda, relato y memoria a la derecha */}
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,hsl(var(--background))_65%)]"
            />
            <div className="relative mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-4 overflow-y-auto px-4 py-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,1fr)] lg:overflow-hidden">
              <Stage scene={scene} />

              <div className="flex min-h-0 flex-col gap-3">
                <SceneNarration scene={scene} />
                {isEnding ? (
                  <SummaryPanel game={game} />
                ) : (
                  <MemoryPanel game={game} />
                )}
              </div>
            </div>
          </main>

          {/* ACCIONES: franja propia al pie, dos columnas */}
          {!isEnding && (
            <footer className="shrink-0 border-t bg-card/40 px-4 py-3 backdrop-blur">
              <div className="mx-auto w-full max-w-7xl space-y-2.5">
                <OptionsGrid game={game} />
                <VoteStatusBar game={game} />
              </div>
            </footer>
          )}
        </>
      )}

      {role === 'admin' && <AdminDock game={game} />}
    </div>
  )
}
