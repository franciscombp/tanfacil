import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from './supabase'
import type { GameState } from '@/engine/types'

/**
 * Capa de sala en tiempo real (Supabase Realtime, sin tablas ni RLS).
 *
 * Pensada para salas de ~50 personas:
 * - La PRESENCIA lleva sólo lo mínimo de cada participante (identidad y voto),
 *   así cada cambio de voto mueve un payload pequeño.
 * - El ESTADO de la partida viaja por broadcast: lo emite únicamente el
 *   anfitrión al cambiar y como latido periódico, para que quien entra tarde
 *   o pierde un mensaje converja solo. Manda siempre la versión más alta.
 * - La conexión se recupera sola: backoff exponencial y reintento inmediato
 *   al volver a la pestaña o recuperar la red.
 */

export type RoomRole = 'player' | 'admin'
export type RoomStatus = 'connecting' | 'connected' | 'offline'

/** Lo único que publica cada participante. */
export interface RoomPresence {
  pid: string
  name: string
  role: RoomRole
  joinedAt: number
  /** Voto de la ronda actual (null si no ha votado). */
  vote: string | null
  /** `sceneId#round` al que corresponde el voto. */
  voteKey: string
}

const CONNECT_TIMEOUT_MS = 10000
const STATE_EVENT = 'state'

interface UseRoomArgs {
  channelName: string
  pid: string
  /** Presencia propia; re-publicada automáticamente cuando cambia. */
  presence: RoomPresence
  /** Estado recibido de otro participante (decidir si se adopta es del caller). */
  onState: (state: GameState) => void
}

export function useRoom({ channelName, pid, presence, onState }: UseRoomArgs) {
  const [members, setMembers] = useState<RoomPresence[]>([])
  const [status, setStatus] = useState<RoomStatus>(
    isSupabaseConfigured ? 'connecting' : 'offline'
  )
  /** Sube en cada reintento y fuerza recrear el canal. */
  const [retry, setRetry] = useState(0)
  const [connectedAt, setConnectedAt] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const presenceRef = useRef(presence)
  presenceRef.current = presence
  const onStateRef = useRef(onState)
  onStateRef.current = onState

  const track = useCallback(() => {
    if (!channelRef.current || !subscribedRef.current) return
    void channelRef.current.track(presenceRef.current)
  }, [])

  /** Emite el estado de la partida a toda la sala (lo usa el anfitrión). */
  const sendState = useCallback((state: GameState) => {
    if (!channelRef.current || !subscribedRef.current) return
    void channelRef.current.send({
      type: 'broadcast',
      event: STATE_EVENT,
      payload: state,
    })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Sólo se declara "sin conexión" si el corte dura; los cierres breves
    // (pestaña en segundo plano, cambio de red) se muestran como reconexión.
    const timeout = setTimeout(() => {
      if (!subscribedRef.current) setStatus('offline')
    }, CONNECT_TIMEOUT_MS)

    // Espera creciente entre reintentos, hasta 30 s.
    const backoff = Math.min(30_000, 2000 * 2 ** Math.min(retry, 4))
    let rejoin: ReturnType<typeof setTimeout> | undefined

    /**
     * Al cerrar el canal, Supabase avisa con CLOSED en este mismo callback.
     * Sin esta marca, la limpieza del efecto programaría otro reintento y el
     * canal entraría en un bucle de crear y destruir.
     */
    let disposed = false

    const scheduleRejoin = (reason: string) => {
      if (disposed || rejoin) return
      console.info(`[sala] ${reason}: reintentando en ${backoff / 1000}s`)
      rejoin = setTimeout(() => setRetry((value) => value + 1), backoff)
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: pid } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomPresence>()
        const list = Object.values(state)
          .map((entries) => entries[0])
          .filter((entry): entry is RoomPresence & { presence_ref: string } =>
            Boolean(entry && entry.pid)
          )
          .map(({ pid, name, role, joinedAt, vote, voteKey }) => ({
            pid,
            name,
            role: role === 'admin' ? ('admin' as const) : ('player' as const),
            joinedAt,
            vote: vote ?? null,
            voteKey: voteKey ?? '',
          }))
        setMembers(list)
      })
      .on('broadcast', { event: STATE_EVENT }, ({ payload }) => {
        if (payload) onStateRef.current(payload as GameState)
      })
      .subscribe((subscription) => {
        if (disposed) return

        if (subscription === 'SUBSCRIBED') {
          subscribedRef.current = true
          setStatus('connected')
          setConnectedAt(Date.now())
          setRetry(0)
          track()
          return
        }

        if (
          subscription === 'CHANNEL_ERROR' ||
          subscription === 'TIMED_OUT' ||
          subscription === 'CLOSED'
        ) {
          subscribedRef.current = false
          // Un corte no es "sin conexión" todavía: se intenta volver a entrar.
          setStatus((current) => (current === 'offline' ? current : 'connecting'))
          scheduleRejoin(subscription)
        }
      })

    // Al volver a la pestaña o recuperar la red, reconectar sin esperar.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !subscribedRef.current) {
        setRetry((value) => value + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      disposed = true
      clearTimeout(timeout)
      if (rejoin) clearTimeout(rejoin)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      subscribedRef.current = false
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [channelName, pid, retry, track])

  // Re-publica la presencia propia cuando cambia (nombre, voto, ronda).
  useEffect(() => {
    track()
  }, [presence, track])

  /**
   * Keepalive: el grupo puede pasar minutos leyendo o conversando sin tocar
   * nada. Re-publicar la presencia periódicamente mantiene tráfico en el
   * canal para que ni el socket ni el proyecto se den por inactivos.
   */
  useEffect(() => {
    const timer = setInterval(track, 30_000)
    return () => clearInterval(timer)
  }, [track])

  return { members, status, connectedAt, sendState, publishPresence: track }
}
