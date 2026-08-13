import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from './supabase'
import { STORY_SCENES } from '@/data/storyData'

/**
 * Sala única del POC.
 *
 * La sincronización se hace con Supabase Realtime Presence: no requiere tablas
 * ni políticas RLS, sólo la anon key. Cada jugador publica su estado
 * (nombre, escena actual y voto) y todos reciben el estado completo de la sala.
 *
 * El "anfitrión" es el jugador que lleva más tiempo conectado. Es el único que
 * decide cuándo avanzar de escena; el resto sigue la escena del anfitrión, así
 * todos ven siempre lo mismo.
 */
const ROOM = 'room:poc-session-001'
const FIRST_SCENE = 'scene_001'

/** Tiempo que se muestran los resultados antes de avanzar. */
export const REVEAL_MS = 4000

export interface RoomPlayer {
  pid: string
  name: string
  joinedAt: number
  sceneId: string
  vote: string | null
}

export type RoomStatus = 'connecting' | 'connected' | 'offline'

/** Si en este tiempo no hay conexión en vivo, se avisa en pantalla. */
const CONNECT_TIMEOUT_MS = 10000

/** Identidad estable por pestaña: al recargar se mantiene el mismo jugador. */
function getPlayerId(): string {
  const KEY = 'tanfacil_pid'
  let pid = sessionStorage.getItem(KEY)
  if (!pid) {
    pid = `p_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(KEY, pid)
  }
  return pid
}

function getJoinedAt(): number {
  const KEY = 'tanfacil_joined_at'
  const stored = sessionStorage.getItem(KEY)
  if (stored) return Number(stored)
  const now = Date.now()
  sessionStorage.setItem(KEY, String(now))
  return now
}

/** El anfitrión es el más antiguo; el pid desempata para que todos coincidan. */
function pickHost(players: RoomPlayer[]): RoomPlayer | null {
  if (players.length === 0) return null
  return [...players].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.pid.localeCompare(b.pid)
  )[0]
}

export function useGameRoom(displayName: string) {
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [sceneId, setSceneId] = useState<string>(FIRST_SCENE)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>(
    isSupabaseConfigured ? 'connecting' : 'offline'
  )

  const pid = useMemo(getPlayerId, [])
  const joinedAt = useMemo(getJoinedAt, [])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)

  // Se lee dentro de callbacks del canal, siempre con el valor más reciente.
  const selfRef = useRef({ displayName, sceneId, myVote })
  selfRef.current = { displayName, sceneId, myVote }

  const track = useCallback(() => {
    if (!channelRef.current || !subscribedRef.current) return
    const { displayName, sceneId, myVote } = selfRef.current
    void channelRef.current.track({
      pid,
      name: displayName,
      joinedAt,
      sceneId,
      vote: myVote,
    })
  }, [pid, joinedAt])

  // Conexión al canal de la sala.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Sin conexión en vivo tras un tiempo razonable, se informa al jugador.
    const timeout = setTimeout(() => {
      if (!subscribedRef.current) setStatus('offline')
    }, CONNECT_TIMEOUT_MS)

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: pid } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomPlayer>()
        const list = Object.values(state)
          .map((entries) => entries[0])
          .filter((entry): entry is RoomPlayer & { presence_ref: string } =>
            Boolean(entry && entry.pid)
          )
          .map(({ pid, name, joinedAt, sceneId, vote }) => ({
            pid,
            name,
            joinedAt,
            sceneId,
            vote: vote ?? null,
          }))
          .sort((a, b) => a.joinedAt - b.joinedAt)
        setPlayers(list)
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          subscribedRef.current = true
          setStatus('connected')
          track()
        } else if (
          state === 'CHANNEL_ERROR' ||
          state === 'TIMED_OUT' ||
          state === 'CLOSED'
        ) {
          subscribedRef.current = false
          setStatus('offline')
        }
      })

    return () => {
      clearTimeout(timeout)
      subscribedRef.current = false
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [pid, track])

  // Publica el estado propio cada vez que cambia.
  useEffect(() => {
    track()
  }, [displayName, sceneId, myVote, track])

  const scene = STORY_SCENES[sceneId] ?? null

  /** Uno siempre debe verse en la lista, aunque Presence aún no haya sincronizado. */
  const roster = useMemo<RoomPlayer[]>(() => {
    if (players.some((p) => p.pid === pid)) return players
    const self: RoomPlayer = {
      pid,
      name: displayName,
      joinedAt,
      sceneId,
      vote: myVote,
    }
    return [...players, self].sort((a, b) => a.joinedAt - b.joinedAt)
  }, [players, pid, displayName, joinedAt, sceneId, myVote])

  const host = useMemo(() => pickHost(roster), [roster])
  const isHost = host?.pid === pid

  // Los invitados siguen la escena del anfitrión.
  useEffect(() => {
    if (!host || host.pid === pid) return
    if (host.sceneId && host.sceneId !== sceneId) {
      setSceneId(host.sceneId)
      setMyVote(null)
    }
  }, [host, pid, sceneId])

  // Jugadores que ya están en la escena actual (los demás aún la están adoptando).
  const playersHere = useMemo(
    () => roster.filter((p) => p.sceneId === sceneId),
    [roster, sceneId]
  )

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const option of scene?.options ?? []) counts[option.id] = 0
    for (const player of playersHere) {
      if (player.vote && player.vote in counts) counts[player.vote] += 1
    }
    return counts
  }, [playersHere, scene])

  const votedCount = playersHere.filter((p) => p.vote).length
  const allVoted =
    playersHere.length > 0 &&
    votedCount === playersHere.length &&
    (scene?.options.length ?? 0) > 0

  /** Opción más votada; en caso de empate gana la que aparece primero. */
  const winnerOptionId = useMemo(() => {
    if (!scene || scene.options.length === 0) return null
    let winner = scene.options[0].id
    for (const option of scene.options) {
      if (voteCounts[option.id] > voteCounts[winner]) winner = option.id
    }
    return voteCounts[winner] > 0 ? winner : null
  }, [scene, voteCounts])

  // Sólo el anfitrión avanza, tras mostrar los resultados.
  useEffect(() => {
    if (!isHost || !allVoted || !winnerOptionId || !scene) return
    const next = scene.options.find((o) => o.id === winnerOptionId)?.nextScene
    if (!next) return

    const timer = setTimeout(() => {
      setSceneId(next)
      setMyVote(null)
    }, REVEAL_MS)
    return () => clearTimeout(timer)
  }, [isHost, allVoted, winnerOptionId, scene])

  const vote = useCallback(
    (optionId: string) => {
      setMyVote((current) => current ?? optionId)
    },
    []
  )

  const restart = useCallback(() => {
    setSceneId(FIRST_SCENE)
    setMyVote(null)
  }, [])

  return {
    pid,
    scene,
    sceneId,
    players: playersHere.length > 0 ? playersHere : roster,
    status,
    isHost,
    hostPid: host?.pid ?? null,
    myVote,
    vote,
    restart,
    voteCounts,
    votedCount,
    totalCount: playersHere.length,
    allVoted,
    winnerOptionId,
  }
}
