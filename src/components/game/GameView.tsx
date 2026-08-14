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
    /*
     * En móvil la página fluye y se desplaza: la imagen, el relato y la memoria
     * no caben a la vez en un teléfono y encerrarlos en una altura fija dejaba
     * el texto recortado y fuera de alcance. En pantalla grande —la que se
     * proyecta— sí se fija a la ventana: todo en un solo golpe de vista.
     */
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground lg:fixed lg:inset-0 lg:min-h-0 lg:overflow-hidden">
      {/* CORTINILLA ENTRE ESCENAS */}
      {changing && (
        <div
          key={scene.id}
          className="pointer-events-none fixed inset-0 z-50 grid animate-curtain place-items-center bg-background"
        >
          <p className="animate-pulse-soft text-rotulo uppercase tracking-[0.3em] text-muted-foreground lg:text-apoyo">
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
          {/* El aviso de las 12:00 es la broma central de la charla: es texto
              de la historia proyectado, no chrome. `story.noon` sólo tiene
              saltos SIMPLES (comprobado en el JSON), así que aquí
              `whitespace-pre-line` es exactamente lo correcto y se conserva:
              son tres líneas de un bloque, no tres párrafos. */}
          <p className="max-w-[34em] animate-fade-up whitespace-pre-line rounded-lg border bg-card/95 px-hueco-150 py-hueco text-center text-cuerpo shadow-xl">
            {story.noon}
          </p>
        </div>
      )}

      {/* BARRA SUPERIOR, mínima */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-5 backdrop-blur sm:px-8 lg:static">
        {waiting ? (
          <Badge variant="outline" className="uppercase tracking-wide">
            Sala de espera
          </Badge>
        ) : (
          <>
            <Badge
              variant="secondary"
              className="font-mono tracking-normal tabular-nums"
              title="La hora de la historia. Pasar de las 12:00 no penaliza nada."
            >
              <Clock3 /> {storyClock(story, elapsedSeconds)}
            </Badge>
            <span className="hidden truncate text-rotulo normal-case tracking-normal text-muted-foreground sm:inline">
              {pastDeadline ? 'Son más de las 12:00 y el jefe no aparece' : story.premise}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-rotulo text-muted-foreground"
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
        <div className="shrink-0 border-b bg-destructive/10 px-hueco py-hueco-25 text-center text-rotulo normal-case tracking-normal text-destructive">
          Sin conexión en vivo: no verás a otros jugadores ni se sincronizará la partida.
        </div>
      )}

      {waiting ? (
        <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">
          <WaitingRoom game={game} />
        </main>
      ) : (
        <>
          {/* ESCENA: imagen a la izquierda, relato y memoria a la derecha */}
          <main className="relative flex flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,hsl(var(--background))_65%)]"
            />
            {/*
              1.6fr/1fr dejaba la columna del relato en ~360 px a 1024: con el
              cuerpo nuevo salían 38 caracteres por línea, por debajo del suelo
              legible. Dos escalones (1fr a lg, 1.25fr a xl) mantienen la
              medida entre 50 y 55 caracteres de 1024 a 1920.

              En un final no hay franja de acciones y en cambio hay resumen:
              ahí la columna se desplaza entera en vez de encerrar el relato en
              un scroll propio de dos líneas.
            */}
            <div
              className={`relative mx-auto grid w-full max-w-[100rem] flex-1 gap-hueco-150 px-5 py-hueco-150 sm:px-8 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(23rem,1fr)] lg:gap-hueco-200 lg:py-hueco xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,1fr)] 2xl:px-12 ${
                isEnding ? 'lg:overflow-y-auto' : 'lg:overflow-hidden'
              }`}
            >
              <Stage scene={scene} />

              <div className="flex flex-col gap-hueco-150 lg:gap-hueco lg:min-h-0">
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
            <footer className="sticky bottom-0 z-30 shrink-0 border-t bg-card/90 px-5 py-hueco backdrop-blur sm:px-8 lg:py-hueco-75 lg:static lg:bg-card/40 2xl:px-12">
              <div className="mx-auto w-full max-w-[100rem] space-y-hueco-75">
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
