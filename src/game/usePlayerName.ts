import { useCallback, useState } from 'react'

const KEY = 'tanfacil_name'

/** Nombre del jugador, recordado en la pestaña: recargar no te echa. */
export function usePlayerName(): [string, (name: string) => void] {
  const [name, setName] = useState(() => sessionStorage.getItem(KEY) ?? '')

  const save = useCallback((value: string) => {
    sessionStorage.setItem(KEY, value)
    setName(value)
  }, [])

  return [name, save]
}
