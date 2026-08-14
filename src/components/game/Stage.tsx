import type { Scene } from '@/engine/types'

/**
 * La imagen: lo primero que mira la sala. Ocupa todo el alto disponible de su
 * columna y no compite con nada más.
 */
export function Stage({ scene }: { scene: Scene }) {
  return (
    <div key={scene.id} className="flex min-h-0 w-full flex-1 animate-fade-up">
      {scene.illustration ? (
        <img
          src={scene.illustration}
          alt={scene.title}
          className="h-full w-full rounded-xl border object-contain shadow-lg"
        />
      ) : (
        <div className="grid h-full w-full select-none place-items-center rounded-xl border bg-card text-[clamp(4rem,16vh,8rem)] leading-none">
          {scene.art}
        </div>
      )}
    </div>
  )
}
