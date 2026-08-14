import type { Scene } from '@/engine/types'

/**
 * La imagen: lo primero que mira la sala.
 *
 * Cubre todo el espacio de su columna (`object-cover`), sin bandas vacías
 * dentro del marco. En móvil mantiene una proporción cómoda a ancho completo;
 * en pantalla grande se estira hasta llenar la altura disponible.
 */
export function Stage({ scene }: { scene: Scene }) {
  const common =
    'w-full rounded-2xl border object-cover shadow-xl aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-full'

  return (
    /*
     * En móvil el bloque se dimensiona por su contenido: `min-h-0` dejaba que
     * la fila se comprimiera por debajo de la imagen y ésta desbordaba sobre
     * el texto. En pantalla grande sí se estira, para llenar la columna.
     */
    <div
      key={scene.id}
      className="flex w-full animate-fade-up items-start lg:min-h-0 lg:flex-1 lg:items-stretch"
    >
      {scene.illustration ? (
        <img src={scene.illustration} alt={scene.title} className={common} />
      ) : (
        <div
          className={`${common} grid select-none place-items-center bg-card text-[clamp(4rem,16vh,8rem)] leading-none`}
        >
          {scene.art}
        </div>
      )}
    </div>
  )
}
