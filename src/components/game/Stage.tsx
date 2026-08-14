import type { Scene } from '@/engine/types'
import { Badge } from '@/components/ui/badge'

/**
 * El escenario: la ilustración manda. El texto narrativo va compacto y con
 * altura limitada (el facilitador lo narra si hace falta): nunca debe empujar
 * las opciones fuera de la pantalla.
 */
export function Stage({ scene }: { scene: Scene }) {
  return (
    <div
      key={scene.id}
      className="flex w-full animate-fade-up flex-col items-center gap-3 text-center"
    >
      {scene.illustration ? (
        <img
          src={scene.illustration}
          alt={scene.title}
          className="max-h-[52vh] w-full rounded-xl border object-contain shadow-lg"
        />
      ) : (
        <div className="grid h-[30vh] w-full select-none place-items-center rounded-xl border bg-card text-[clamp(4rem,16vh,8rem)] leading-none">
          {scene.art}
        </div>
      )}

      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-base">
          {scene.title}
        </h1>
        {scene.type === 'detour' && (
          <Badge variant="outline" className="shrink-0 uppercase tracking-wide">
            Desvío
          </Badge>
        )}
        {scene.type === 'ending' && (
          <Badge variant="secondary" className="shrink-0 uppercase tracking-wide">
            Final
          </Badge>
        )}
      </div>

      <p className="max-h-[22vh] w-full max-w-2xl overflow-y-auto whitespace-pre-line text-pretty text-sm leading-relaxed text-foreground/85 sm:text-base">
        {scene.text}
      </p>
    </div>
  )
}
