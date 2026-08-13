import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyOption,
  forceOption,
  initialState,
  leadersOf,
  missingSlots,
  resolveVote,
  sceneWithConclusion,
  tally,
} from '@/engine/rules'
import type { GameMetrics, GameState } from '@/engine/types'
import { useRoom, type RoomPresence, type RoomRole } from '@/realtime/useRoom'
import { story } from './story'

/**
 * Orquestación de la partida.
 *
 * Un solo participante —el anfitrión— ejecuta las reglas y emite el estado;
 * el resto lo replica. El anfitrión es el admin si hay uno conectado; si no,
 * el jugador más antiguo, para que la sala nunca se quede bloqueada. El admin
 * modera (no vota) y ve la misma interfaz que el resto.
 */

const ROOM = `room:${story.id}`

/** Al conectar se espera un latido antes de dirigir, para no pisar la partida. */
const HOST_WARMUP_MS = 4000

/** Latido del anfitrión: cubre a quien entra tarde o pierde un broadcast. */
const HEARTBEAT_MS = 5000

const bySeniority = (a: RoomPresence, b: RoomPresence) =>
  a.joinedAt - b.joinedAt || a.pid.localeCompare(b.pid)

function pickHost(members: RoomPresence[]): RoomPresence | null {
  const admins = members.filter((member) => member.role === 'admin').sort(bySeniority)
  if (admins.length > 0) return admins[0]
  return members.filter((member) => member.role === 'player').sort(bySeniority)[0] ?? null
}

function persistentId(role: RoomRole): string {
  const KEY = `tanfacil_pid_${role}`
  let pid = sessionStorage.getItem(KEY)
  if (!pid) {
    pid = `${role}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(KEY, pid)
  }
  return pid
}

function persistentJoinedAt(role: RoomRole): number {
  const KEY = `tanfacil_joined_${role}`
  const stored = sessionStorage.getItem(KEY)
  if (stored) return Number(stored)
  const now = Date.now()
  sessionStorage.setItem(KEY, String(now))
  return now
}

export function useGame(displayName: string, role: RoomRole) {
  const pid = useMemo(() => persistentId(role), [role])
  const joinedAt = useMemo(() => persistentJoinedAt(role), [role])

  const [state, setState] = useState<GameState>(() => initialState(story, Date.now()))
  const [myVote, setMyVote] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const stateRef = useRef(state)
  stateRef.current = state

  // Reloj local para cuentas atrás (2 Hz basta: los tiempos son en segundos).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  const voteKey = `${state.sceneId}#${state.round}`

  const presence = useMemo<RoomPresence>(
    () => ({ pid, name: displayName, role, joinedAt, vote: myVote, voteKey }),
    [pid, displayName, role, joinedAt, myVote, voteKey]
  )

  // Estado entrante: manda la versión más alta, venga de quien venga.
  const onState = useCallback((incoming: GameState) => {
    if (incoming.version > stateRef.current.version) setState(incoming)
  }, [])

  const { members, status, connectedAt, sendState } = useRoom({
    channelName: ROOM,
    pid,
    presence,
    onState,
  })

  /** Uno siempre se ve en la sala, aunque la presencia tarde en sincronizar. */
  const roster = useMemo<RoomPresence[]>(() => {
    if (members.some((member) => member.pid === pid)) return members
    return [...members, presence]
  }, [members, pid, presence])

  const host = useMemo(() => pickHost(roster), [roster])
  const isHost = host?.pid === pid
  const admin = useMemo(
    () => roster.find((member) => member.role === 'admin') ?? null,
    [roster]
  )

  /**
   * Ventana de adopción: al conectar con más gente en la sala, el anfitrión
   * nuevo espera un latido antes de dirigir, para continuar la partida en
   * curso en vez de pisarla con su estado inicial.
   */
  const engineReady =
    status !== 'connected' ||
    members.length <= 1 ||
    now - connectedAt >= HOST_WARMUP_MS

  /** Cambia el estado y lo emite a la sala en el mismo paso. */
  const commit = useCallback(
    (next: GameState) => {
      const versioned = { ...next, version: stateRef.current.version + 1 }
      setState(versioned)
      sendState(versioned)
    },
    [sendState]
  )

  // Al cambiar de escena o ronda se limpia el voto propio.
  const roundKeyRef = useRef(voteKey)
  useEffect(() => {
    const key = `${state.sceneId}#${state.round}`
    if (roundKeyRef.current !== key) {
      roundKeyRef.current = key
      setMyVote(null)
    }
  }, [state.sceneId, state.round])

  const scene = useMemo(() => sceneWithConclusion(story, state), [state])

  // Sólo votan los jugadores; el admin modera.
  const players = useMemo(
    () => roster.filter((member) => member.role === 'player'),
    [roster]
  )
  const currentVotes = useMemo(
    () =>
      players
        .filter((player) => player.voteKey === voteKey && player.vote)
        .map((player) => player.vote as string),
    [players, voteKey]
  )

  const voteCounts = useMemo(
    () => (scene ? tally(scene, currentVotes) : {}),
    [scene, currentVotes]
  )
  const leaders = useMemo(
    () => (scene ? leadersOf(scene, voteCounts) : []),
    [scene, voteCounts]
  )

  const votedCount = currentVotes.length
  const totalCount = players.length
  const pendingPlayers = players.filter(
    (player) => !(player.voteKey === voteKey && player.vote)
  )
  const everyoneVoted = totalCount > 0 && votedCount === totalCount

  // ─── Motor: sólo lo ejecuta el anfitrión ─────────────────────────────────
  useEffect(() => {
    if (!isHost || !engineReady || !scene) return

    if (state.phase === 'voting') {
      if (scene.options.length === 0) return
      // Si ya votaron todos, se acorta la espera pero queda margen para
      // rectificar antes del cierre.
      const grace = story.timers.allVotedGraceSeconds * 1000
      if (everyoneVoted && state.deadline > now + grace) {
        commit({ ...state, deadline: now + grace })
        return
      }
      if (now >= state.deadline) {
        commit(resolveVote(story, state, leaders, Boolean(admin), now))
      }
      return
    }

    if (state.phase === 'reveal' && now >= state.deadline && state.winner) {
      commit(applyOption(story, state, scene, state.winner, now))
    }
  }, [isHost, engineReady, scene, state, everyoneVoted, leaders, admin, now, commit])

  // Latido del anfitrión: quien entra tarde converge en segundos.
  useEffect(() => {
    if (!isHost || status !== 'connected') return
    sendState(stateRef.current)
    const timer = setInterval(() => sendState(stateRef.current), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [isHost, status, sendState])

  // ─── Acciones ────────────────────────────────────────────────────────────

  const vote = useCallback(
    (optionId: string) => {
      if (state.phase !== 'voting' || role !== 'player') return
      setMyVote(optionId)
    },
    [state.phase, role]
  )

  /** El anfitrión fuerza una opción: resuelve empates o destraba la partida. */
  const decide = useCallback(
    (optionId: string) => {
      if (!isHost || !scene) return
      if (!scene.options.some((option) => option.id === optionId)) return
      commit(forceOption(story, stateRef.current, optionId, Date.now()))
    },
    [isHost, scene, commit]
  )

  const closeVoteNow = useCallback(() => {
    if (!isHost || stateRef.current.phase !== 'voting') return
    commit({ ...stateRef.current, deadline: Date.now() })
  }, [isHost, commit])

  const repeatVote = useCallback(() => {
    if (!isHost) return
    const current = stateRef.current
    commit({
      ...current,
      phase: 'voting',
      round: current.round + 1,
      winner: null,
      repeatReason: null,
      deadline: Date.now() + story.timers.voteSeconds * 1000,
    })
  }, [isHost, commit])

  const restart = useCallback(() => {
    if (!isHost) return
    commit(initialState(story, Date.now()))
  }, [isHost, commit])

  // ─── Derivados para la interfaz ──────────────────────────────────────────

  const elapsedSeconds = Math.max(
    0,
    Math.floor(((state.solvedAt ?? now) - state.startedAt) / 1000)
  )
  const pastDeadline = elapsedSeconds >= story.secondsToDeadline

  const since = (moment: number | null): number | null =>
    moment === null ? null : Math.floor((moment - state.startedAt) / 1000)

  const metrics: GameMetrics = {
    elapsedSeconds,
    timeToFirstAction: since(state.firstActionAt),
    timeToFirstInvestigation: since(state.firstInvestigationAt),
    timeToConclusion: since(state.solvedAt),
    detours: state.detours,
    cardsDrawn: state.drawn.length,
    keyCards: state.drawn.filter((id) => story.cardsById[id]?.key).length,
    noiseCards: state.drawn.filter((id) => story.cardsById[id]?.noise).length,
  }

  const board = useMemo(() => {
    const grouped: Record<string, typeof story.deck> = {}
    for (const id of state.drawn) {
      const card = story.cardsById[id]
      if (!card) continue
      grouped[card.slot] = [...(grouped[card.slot] ?? []), card]
    }
    return grouped
  }, [state.drawn])

  return {
    story,
    pid,
    role,
    scene,
    status,
    phase: state.phase,
    round: state.round,
    repeatReason: state.repeatReason,
    voteSecondsLeft:
      state.deadline > 0 ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null,
    elapsedSeconds,
    pastDeadline,
    metrics,
    board,
    missingSlots: missingSlots(story, state.drawn),
    lastCard: state.lastCard ? (story.cardsById[state.lastCard] ?? null) : null,
    checkpoints: state.checkpoints,
    players,
    pendingPlayers,
    admin,
    isHost,
    myVote,
    voteCounts,
    votedCount,
    totalCount,
    leaders,
    winnerOptionId: state.winner,
    vote,
    decide,
    closeVoteNow,
    repeatVote,
    restart,
  }
}

export type Game = ReturnType<typeof useGame>
