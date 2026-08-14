import { useEffect } from 'react'

/**
 * Votar con el teclado: las letras A-D (y los números 1-4) eligen la opción
 * de esa posición. Las letras ya están impresas en cada botón, así que la
 * interfaz lo estaba prometiendo; esto lo cumple.
 *
 * Se ignora si el foco está en un campo de texto o si hay teclas modificadoras
 * (para no pisar los atajos del navegador).
 */
const KEYS: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
}

export function useKeyboardVote(
  enabled: boolean,
  onPick: (index: number) => void
): void {
  useEffect(() => {
    if (!enabled) return

    const handle = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return
      }

      const index = KEYS[event.key.toLowerCase()]
      if (index === undefined) return

      event.preventDefault()
      onPick(index)
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [enabled, onPick])
}
