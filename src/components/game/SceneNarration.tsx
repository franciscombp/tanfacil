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
    /*
     * Sin `flex-1` a propósito: al hacer crecer este bloque para repartir la
     * columna, abría un hueco muerto entre el relato y la memoria y empujaba
     * al panel fuera del borde inferior, donde quedaba cortado. Se mide por
     * su contenido y la memoria queda justo debajo.
     */
    <div key={scene.id} className="flex animate-fade-up flex-col lg:min-h-0">
      <div className="flex flex-wrap items-center gap-x-hueco gap-y-hueco-50">
        <h1 className="mb-[0.55em] text-balance text-titulo font-semibold text-foreground">
          {scene.title}
        </h1>
        {scene.type === 'detour' && (
          <Badge variant="outline" className="mb-[0.55em] text-muted-foreground">
            Desvío
          </Badge>
        )}
        {scene.type === 'convergence' && (
          <Badge variant="outline" className="mb-[0.55em] text-muted-foreground">
            Punto de decisión
          </Badge>
        )}
        {scene.type === 'ending' && (
          <Badge variant="secondary" className="mb-[0.55em]">
            Final
          </Badge>
        )}
      </div>

      {/*
        Párrafos de verdad: el guion trae `\n\n` entre párrafos y `\n` simple
        dentro de algunos (los diálogos encadenados), y `whitespace-pre-line`
        los trataba igual, abriendo un renglón vacío entre párrafos. Ahora el
        hueco es 0,75em del propio cuerpo y los versos internos se conservan.

        Sólo scroll propio en pantalla grande: en móvil se desplaza la página
        entera. Cuerpo a opacidad plena, que el proyector ya lava el contraste.
      */}
      <div
        className={`text-cuerpo text-foreground [&>p+p]:mt-[0.75em] lg:pr-hueco-50 ${
          scene.type === 'ending' ? '' : 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto'
        }`}
      >
        {parrafos.map((parrafo, i) => (
          <p key={i} className="whitespace-pre-line text-pretty">
            {parrafo}
          </p>
        ))}
      </div>
    </div>
  )
}
