import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from './supabase'
import { STORY_SCENES } from '@/data/storyData'

/**
 * Sala única del POC.
 *
 * La sincronización se hace con Supabase Realtime Presence: no requiere tablas
 * ni políticas RLS, sólo la anon key. Cada participante publica su estado
 * (nombre, rol, escena y voto) y todos reciben el estado completo de la sala.
 *
 * El anfitrión es el admin (quien entra por /admin). Es el único que decide la
 * escena; el resto la sigue, así todos ven siempre lo mismo. Si no hay admin
 * conectado, el jugador más antiguo hace de anfitrión para que la partida no se
 * quede bloqueada.
 */
const ROOM = 'room:poc-session-001'
const FIRST_SCENE = 'scene_001'

/** Tiempo que se muestran los resultados antes de avanzar. */
export const REVEAL_MS = 4000

/** Si en este tiempo no hay conexión en vivo, se avisa en pantalla. */
const CONNECT_TIMEOUT_MS = 10000

export type RoomRole = 'player' | 'admin'

export interface RoomMember {
  pid: string
  name: string
  role: RoomRole
  joinedAt: number
  sceneId: string
  vote: string | null
}

export type RoomStatus = 'connecting' | 'connected' | 'offline'

/** Identidad estable por pestaña: al recargar se mantiene el mismo participante. */
function getPersistentId(role: RoomRole): string {
  const KEY = `tanfacil_pid_${role}`
  let pid = sessionStorage.getItem(KEY)
  if (!pid) {
    pid = `${role}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(KEY, pid)
  }
  return pid
}

function getJoinedAt(role: RoomRole): number {
  const KEY = `tanfacil_joined_${role}`
  const stored = sessionStorage.getItem(KEY)
  if (stored) return Number(stored)
  const now = Date.now()
  sessionStorage.setItem(KEY, String(now))
  return now
}

const bySeniority = (a: RoomMember, b: RoomMember) =>
  a.joinedAt - b.joinedAt || a.pid.localeCompare(b.pid)

/** Manda el admin; si no hay ninguno, el jugador más antiguo. */
function pickHost(members: RoomMember[]): RoomMember | null {
  const admins = members.filter((m) => m.role === 'admin').sort(bySeniority)
  if (admins.length > 0) return admins[0]
  const players = members.filter((m) => m.role === 'player').sort(bySeniority)
  return players[0] ?? null
}

export function useGameRoom(displayName: string, role: RoomRole = 'player') {
  const [members, setMembers] = useState<RoomMember[]>([])
  const [sceneId, setSceneId] = useState<string>(FIRST_SCENE)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>(
    isSupabaseConfigured ? 'connecting' : 'offline'
  )

  const pid = useMemo(() => getPersistentId(role), [role])
  const joinedAt = useMemo(() => getJoinedAt(role), [role])

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
      role,
      joinedAt,
      sceneId,
      vote: myVote,
    })
  }, [pid, role, joinedAt])

  // Conexión al canal de la sala.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const timeout = setTimeout(() => {
      if (!subscribedRef.current) setStatus('offline')
    }, CONNECT_TIMEOUT_MS)

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: pid } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomMember>()
        const list = Object.values(state)
          .map((entries) => entries[0])
          .filter((entry) => Boolean(entry && entry.pid))
          .map((entry) => ({
            pid: entry.pid,
            name: entry.name,
            role: entry.role === 'admin' ? ('admin' as const) : ('player' as const),
            joinedAt: entry.joinedAt,
            sceneId: entry.sceneId,
            vote: entry.vote ?? null,
          }))
          .sort(bySeniority)
        setMembers(list)
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

  /** Uno siempre debe verse en la sala, aunque Presence aún no haya sincronizado. */
  const roster = useMemo<RoomMember[]>(() => {
    if (members.some((m) => m.pid === pid)) return members
    const self: RoomMember = {
      pid,
      name: displayName,
      role,
      joinedAt,
      sceneId,
      vote: myVote,
    }
    return [...members, self].sort(bySeniority)
  }, [members, pid, displayName, role, joinedAt, sceneId, myVote])

  const host = useMemo(() => pickHost(roster), [roster])
  const isHost = host?.pid === pid
  const admin = useMemo(
    () => roster.find((m) => m.role === 'admin') ?? null,
    [roster]
  )

  // Sólo votan los jugadores; el admin modera.
  const players = useMemo(
    () => roster.filter((m) => m.role === 'player'),
    [roster]
  )

  // Los invitados siguen la escena del anfitrión.
  useEffect(() => {
    if (!host || host.pid === pid) return
    if (host.sceneId && host.sceneId !== sceneId) {
      setSceneId(host.sceneId)
      setMyVote(null)
    }
  }, [host, pid, sceneId])

  /** Jugadores que ya están en la escena actual (los demás la están adoptando). */
  const playersHere = useMemo(
    () => players.filter((p) => p.sceneId === sceneId),
    [players, sceneId]
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
  const pendingPlayers = playersHere.filter((p) => !p.vote)
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

  /** Avanza la historia. Sólo tiene efecto para el anfitrión. */
  const advance = useCallback(
    (optionId?: string) => {
      if (!isHost || !scene) return
      const chosen = optionId ?? winnerOptionId
      const next = scene.options.find((o) => o.id === chosen)?.nextScene
      if (!next) return
      setSceneId(next)
      setMyVote(null)
    },
    [isHost, scene, winnerOptionId]
  )

  // Avance automático tras mostrar los resultados.
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

  const vote = useCallback((optionId: string) => {
    setMyVote((current) => current ?? optionId)
  }, [])

  const restart = useCallback(() => {
    setSceneId(FIRST_SCENE)
    setMyVote(null)
  }, [])

  return {
    pid,
    scene,
    sceneId,
    status,
    /** Jugadores de la escena actual (los que votan). */
    players: playersHere.length > 0 ? playersHere : players,
    pendingPlayers,
    /** Admin conectado, si lo hay. */
    admin,
    isHost,
    hostPid: host?.pid ?? null,
    myVote,
    vote,
    advance,
    restart,
    voteCounts,
    votedCount,
    totalCount: playersHere.length,
    allVoted,
    winnerOptionId,
  }
}
