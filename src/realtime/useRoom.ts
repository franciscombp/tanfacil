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
  /** Se le perdió la pista hace poco: móvil en reposo, pestaña de fondo… */
  absent?: boolean
}

/**
 * Cuánto se tarda en declarar «sin conexión» con la pestaña a la vista. Se
 * espera de sobra: el grupo está conversando y una reconexión de unos
 * segundos no debe alarmar a nadie. Con la pestaña en segundo plano no se
 * declara nunca: ahí el navegador corta el socket a propósito.
 */
const OFFLINE_AFTER_MS = 60_000

/**
 * Gracia antes de dar por ido a alguien. Un móvil que se bloquea sale del
 * canal enseguida; durante este margen sigue en la sala y su voto ya emitido
 * se mantiene en el recuento.
 */
const ABSENT_GRACE_MS = 180_000

const STATE_EVENT = 'state'

/**
 * Mezcla la presencia recibida con quienes se vieron hace poco. Un móvil que
 * se bloquea o una pestaña que pasa a segundo plano salen del canal en
 * segundos; sin esta gracia desaparecerían de la sala a mitad de la
 * conversación y su voto dejaría de contar.
 */
function withGrace(
  present: RoomPresence[],
  lastSeen: Map<string, { member: RoomPresence; at: number }>
): RoomPresence[] {
  const now = Date.now()
  for (const member of present) lastSeen.set(member.pid, { member, at: now })

  const here = new Set(present.map((member) => member.pid))
  const absent: RoomPresence[] = []

  for (const [pid, entry] of lastSeen) {
    if (here.has(pid)) continue
    if (now - entry.at > ABSENT_GRACE_MS) {
      lastSeen.delete(pid)
      continue
    }
    absent.push({ ...entry.member, absent: true })
  }

  return [...present, ...absent]
}

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
  /** Última vez que se vio a cada participante, para la gracia de ausencia. */
  const lastSeenRef = useRef(new Map<string, { member: RoomPresence; at: number }>())
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

    // Sólo se declara "sin conexión" si el corte dura de verdad y la pestaña
    // está a la vista: en segundo plano el navegador corta el socket aposta.
    const timeout = setTimeout(() => {
      if (!subscribedRef.current && document.visibilityState === 'visible') {
        setStatus('offline')
      }
    }, OFFLINE_AFTER_MS)

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
        setMembers(withGrace(list, lastSeenRef.current))
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
          if (document.visibilityState === 'visible') scheduleRejoin(subscription)
        }
      })

    /**
     * Al volver a la pestaña, recuperar la red o restaurar la página desde la
     * caché del navegador (típico al despertar un móvil), se reconecta sin
     * esperar al backoff y se vuelve a publicar la presencia.
     */
    const onWake = () => {
      if (document.visibilityState !== 'visible') return
      if (subscribedRef.current) {
        track()
        return
      }
      setRetry((value) => value + 1)
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('pageshow', onWake)

    return () => {
      disposed = true
      clearTimeout(timeout)
      if (rejoin) clearTimeout(rejoin)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('pageshow', onWake)
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
    const timer = setInterval(track, 20_000)
    return () => clearInterval(timer)
  }, [track])

  // Los ausentes caducan solos aunque no lleguen más eventos de presencia.
  useEffect(() => {
    const timer = setInterval(() => {
      setMembers((current) => {
        const present = current.filter((member) => !member.absent)
        const merged = withGrace(present, lastSeenRef.current)
        return merged.length === current.length ? current : merged
      })
    }, 15_000)
    return () => clearInterval(timer)
  }, [])

  /**
   * Mientras la pantalla está a la vista se pide no dormir: en el móvil el
   * bloqueo automático corta el socket justo cuando el grupo está debatiendo.
   */
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    if (!nav.wakeLock) return

    let sentinel: { release: () => Promise<void> } | null = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinel = await nav.wakeLock!.request('screen')
      } catch {
        // El navegador puede negarlo (batería baja, permisos): no es crítico.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release().catch(() => {})
    }
  }, [])

  return { members, status, connectedAt, sendState, publishPresence: track }
}
