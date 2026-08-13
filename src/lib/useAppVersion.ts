import { useEffect, useState } from 'react'

/**
 * Actualización transparente.
 *
 * Cada compilación escribe su versión en `version.json`. La app la consulta al
 * abrirse, al volver a la pestaña y cada minuto; si la publicada es distinta a
 * la que se está ejecutando, se recarga sola.
 *
 * La recarga añade `?v=<versión>` a la URL porque GitHub Pages cachea
 * `index.html`: cambiar la query obliga al navegador a pedirlo de nuevo en vez
 * de servir el HTML viejo (que apuntaría otra vez a los archivos antiguos).
 * Un aviso en sessionStorage evita quedarse en bucle de recargas.
 */
const CHECK_INTERVAL_MS = 60_000
const RELOADED_KEY = 'tanfacil_reloaded_for'

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

/**
 * Mientras hay una partida en curso no se recarga: interrumpir una votación
 * para actualizar parece una caída de conexión. La actualización queda
 * pendiente y se aplica al salir de la partida.
 */
let updatesPaused = false
let pendingVersion: string | null = null

export function pauseUpdates(paused: boolean): void {
  updatesPaused = paused
  if (!paused && pendingVersion) applyUpdate(pendingVersion)
}

function applyUpdate(version: string): void {
  if (sessionStorage.getItem(RELOADED_KEY) === version) return
  sessionStorage.setItem(RELOADED_KEY, version)

  const url = new URL(window.location.href)
  url.searchParams.set('v', version.replace(/[^\w.-]+/g, '_'))
  window.location.replace(url.toString())
}

async function fetchPublishedVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,
      { cache: 'no-store' }
    )
    if (!response.ok) return null
    const data = (await response.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

export function useAppVersion(): { running: string; published: string | null } {
  const [published, setPublished] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const latest = await fetchPublishedVersion()
      if (cancelled || !latest) return
      setPublished(latest)
      if (latest === APP_VERSION) return

      if (updatesPaused) {
        pendingVersion = latest
        return
      }
      applyUpdate(latest)
    }

    void check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { running: APP_VERSION, published }
}
