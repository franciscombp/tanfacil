import type { Scene } from '@/engine/types'
import { Badge } from '@/components/ui/badge'

/**
 * El relato, a la derecha de la imagen: título, tipo de escena y texto con
 * scroll propio. Nunca empuja a las opciones fuera de la pantalla.
 */
export function SceneNarration({ scene }: { scene: Scene }) {
  return (
    <div key={scene.id} className="flex animate-fade-up flex-col gap-3 lg:min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
          {scene.title}
        </h1>
        {scene.type === 'detour' && (
          <Badge variant="outline" className="uppercase tracking-wide">
            Desvío
          </Badge>
        )}
        {scene.type === 'convergence' && (
          <Badge variant="outline" className="uppercase tracking-wide">
            Punto de decisión
          </Badge>
        )}
        {scene.type === 'ending' && (
          <Badge variant="secondary" className="uppercase tracking-wide">
            Final
          </Badge>
        )}
      </div>

      {/* Sólo scroll propio en pantalla grande: en móvil se desplaza la página
          entera, y `flex-1` sobre altura cero dejaba el texto en 0 px. */}
      <p className="whitespace-pre-line text-pretty pr-1 text-base leading-relaxed text-foreground/85 sm:text-lg sm:leading-relaxed lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {scene.text}
      </p>
    </div>
  )
}
