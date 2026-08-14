import { Check, Crown, Hourglass, Play, Users } from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Button } from '@/components/ui/button'

/**
 * Sala de espera. Sólo aparece si hay facilitador conectado: la partida no
 * empieza hasta que él la abre, para que nadie conteste antes de tiempo.
 * Muestra quién ha llegado, que es lo que el facilitador necesita ver antes
 * de arrancar.
 */
export function WaitingRoom({ game }: { game: Game }) {
  const { story, players, canModerate, startGame, status } = game

  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted))_0%,hsl(var(--background))_70%)]"
      />

      <div className="relative flex animate-fade-up flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-3xl">
          🕐
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{story.title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{story.premise}</p>
      </div>

      <div className="relative w-full max-w-lg animate-fade-up rounded-xl border bg-card/70 p-5">
        <p className="flex items-center justify-center gap-2 text-sm font-medium">
          <Users className="size-4 text-muted-foreground" />
          {players.length === 0
            ? 'Nadie ha entrado todavía'
            : `${players.length} ${players.length === 1 ? 'persona' : 'personas'} en la sala`}
        </p>

        {players.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {players.map((player) => (
              <span
                key={player.pid}
                className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-1 text-xs"
              >
                <Check className="size-3 text-primary" />
                {player.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 border-t pt-4">
          {canModerate ? (
            <>
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play /> Comenzar la partida
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Nadie puede votar hasta que la abras. El cronómetro empieza aquí.
              </p>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Hourglass className="size-4 animate-pulse-soft" />
              Esperando a que el facilitador empiece
            </p>
          )}
        </div>
      </div>

      <p className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
        <Crown className="size-3.5" />
        {status === 'connected'
          ? 'Conectado a la sala'
          : status === 'connecting'
            ? 'Conectando…'
            : 'Sin conexión en vivo'}
      </p>
    </div>
  )
}
