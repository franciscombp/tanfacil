import type { Scene } from '@/engine/types'
import { Badge } from '@/components/ui/badge'
import { enParrafos } from '@/lib/utils'

/**
 * El relato, a la derecha de la imagen: título, tipo de escena y texto con
 * scroll propio. Nunca empuja a las opciones fuera de la pantalla.
 */
export function SceneNarration({ scene }: { scene: Scene }) {
  const parrafos = enParrafos(scene.text)

  return (
    <div key={scene.id} className="flex animate-fade-up flex-col lg:min-h-0">
      <div className="flex flex-wrap items-center gap-x-hueco gap-y-hueco-50">
        <h1 className="mb-[0.4em] text-balance text-titulo font-semibold text-foreground">
          {scene.title}
        </h1>
        {scene.type === 'detour' && (
          <Badge variant="outline" className="mb-[0.4em] text-muted-foreground">
            Desvío
          </Badge>
        )}
        {scene.type === 'convergence' && (
          <Badge variant="outline" className="mb-[0.4em] text-muted-foreground">
            Punto de decisión
          </Badge>
        )}
        {scene.type === 'ending' && (
          <Badge variant="secondary" className="mb-[0.4em]">
            Final
          </Badge>
        )}
      </div>

      {/*
        Párrafos de verdad: el guion trae `\n\n` entre párrafos y `\n` simple
        dentro de algunos (los diálogos encadenados), y `whitespace-pre-line`
        los trataba igual, abriendo un renglón vacío entre párrafos. Ahora el
        hueco es 0,6em del propio cuerpo y los versos internos se conservan.

        Sólo scroll propio en pantalla grande: en móvil se desplaza la página
        entera. Cuerpo a opacidad plena, que el proyector ya lava el contraste.
      */}
      <div className="text-cuerpo text-foreground [&>p+p]:mt-[0.6em] lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-hueco-50">
        {parrafos.map((parrafo, i) => (
          <p key={i} className="whitespace-pre-line text-pretty">
            {parrafo}
          </p>
        ))}
      </div>
    </div>
  )
}
