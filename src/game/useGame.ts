import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyOption,
  forceOption,
  initialState,
  jumpToScene,
  leadersOf,
  optionViews,
  tally,
  tickVoting,
  votableOptions,
} from '@/engine/rules'
import type { Fact, GameMetrics, GameState } from '@/engine/types'
import { useRoom, type RoomPresence, type RoomRole } from '@/realtime/useRoom'
import { story } from './story'

/**
 * Orquestación de la partida.
 *
 * Un solo participante —el anfitrión— ejecuta las reglas y emite el estado;
 * el resto lo replica. El anfitrión es el admin si hay uno conectado; si no,
 * el jugador más antiguo, para que la sala nunca se quede bloqueada. El admin
 * facilita (no vota) y ve la misma interfaz que el resto.
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
  /**
   * El voto propio viaja atado a su ronda (`key`). La presencia sólo lo
   * publica si la ronda coincide con el estado actual: sin esto, al cambiar
   * de escena había un instante en que el voto viejo salía con la clave
   * nueva, el motor creía que ya habían votado todos y acortaba la votación.
   */
  const [myVoteEntry, setMyVoteEntry] = useState<{ key: string; optionId: string } | null>(
    null
  )
  const [now, setNow] = useState(() => Date.now())

  const stateRef = useRef(state)
  stateRef.current = state

  // Reloj local para cuentas atrás (2 Hz basta: los tiempos son en segundos).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  const voteKey = `${state.sceneId}#${state.round}`
  const myVote = myVoteEntry?.optionId ?? null
  const publishedVote = myVoteEntry?.key === voteKey ? myVoteEntry.optionId : null

  const presence = useMemo<RoomPresence>(
    () => ({ pid, name: displayName, role, joinedAt, vote: publishedVote, voteKey }),
    [pid, displayName, role, joinedAt, publishedVote, voteKey]
  )

  /**
   * Anti-entropía: si alguien emite un estado más viejo que el mío (p. ej. un
   * anfitrión recién llegado con la partida en cero), le respondo con el mío.
   * Así un admin que entra tarde converge al estado real en un intercambio y
   * nunca dirige una partida paralela.
   */
  const sendStateRef = useRef<((state: GameState) => void) | null>(null)
  const lastCorrectionRef = useRef(0)

  // Estado entrante: manda la versión más alta, venga de quien venga.
  const onState = useCallback((incoming: GameState) => {
    if (incoming.version > stateRef.current.version) {
      setState(incoming)
      return
    }
    if (incoming.version < stateRef.current.version) {
      const at = Date.now()
      if (at - lastCorrectionRef.current > 2000) {
        lastCorrectionRef.current = at
        sendStateRef.current?.(stateRef.current)
      }
    }
  }, [])

  const { members, status, connectedAt, sendState, publishPresence } = useRoom({
    channelName: ROOM,
    pid,
    presence,
    onState,
  })
  sendStateRef.current = sendState

  /**
   * La entrada propia siempre sale del estado local, nunca del eco del
   * servidor: uno conoce su voto antes que nadie. Sin esto, entre el clic y
   * la vuelta de la presencia el recuento seguía diciendo «falta votar», y si
   * esa publicación se perdía se quedaba así indefinidamente.
   */
  const roster = useMemo<RoomPresence[]>(
    () => [...members.filter((member) => member.pid !== pid), presence],
    [members, pid, presence]
  )

  /**
   * Vigilante de publicación: si el eco del servidor no refleja lo que
   * publiqué, lo reenvío. Cubre los `track` que se pierden en una
   * reconexión, que es lo que hacía que los demás no vieran mi voto.
   */
  const echoedVote = members.find((member) => member.pid === pid)?.vote ?? null
  const echoedKey = members.find((member) => member.pid === pid)?.voteKey ?? ''
  useEffect(() => {
    if (status !== 'connected') return
    if (echoedVote === publishedVote && echoedKey === voteKey) return
    const timer = setTimeout(publishPresence, 1200)
    return () => clearTimeout(timer)
  }, [status, echoedVote, publishedVote, echoedKey, voteKey, publishPresence])

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

  /**
   * Cambio de escena → el voto se limpia. Cambio de RONDA en la misma escena
   * → el voto se CONSERVA re-atándolo a la ronda nueva. Sin esto, un voto
   * emitido justo cuando el anfitrión cerraba la ronda llegaba tarde, la
   * ronda se repetía "sin votos" y el voto del jugador desaparecía en
   * silencio: el clásico «voté y no se marcó».
   */
  useEffect(() => {
    setMyVoteEntry((current) => {
      if (!current || current.key === voteKey) return current
      const previousScene = current.key.split('#')[0]
      if (previousScene !== state.sceneId) return null
      // En un desempate sólo sobreviven los votos a opciones empatadas.
      if (state.tiedOptions && !state.tiedOptions.includes(current.optionId)) return null
      return { key: voteKey, optionId: current.optionId }
    })
  }, [voteKey, state.sceneId, state.tiedOptions])

  const scene = story.scenes[state.sceneId] ?? null

  /** Opciones con su estado: bloqueadas («ya intentado») o fuera del desempate. */
  const options = useMemo(
    () => (scene ? optionViews(story, state, scene) : []),
    [scene, state]
  )

  // Sólo votan los jugadores; el admin facilita.
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
    () => (scene ? tally(story, state, scene, currentVotes) : {}),
    [scene, state, currentVotes]
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
      const next = tickVoting(story, state, scene, {
        votedCount,
        everyoneVoted,
        leaders,
        voteCounts,
        now,
      })
      if (next) commit(next)
      return
    }

    if (state.phase === 'reveal' && now >= state.deadline && state.winner) {
      commit(applyOption(story, state, scene, state.winner, voteCounts, now))
    }
  }, [
    isHost,
    engineReady,
    scene,
    state,
    votedCount,
    everyoneVoted,
    leaders,
    voteCounts,
    now,
    commit,
  ])

  // Latido del anfitrión: quien entra tarde converge en segundos.
  useEffect(() => {
    if (!isHost || status !== 'connected') return
    sendState(stateRef.current)
    const timer = setInterval(() => sendState(stateRef.current), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [isHost, status, sendState])

  // ─── Acciones ────────────────────────────────────────────────────────────

  /**
   * Cualquier admin puede facilitar, sea o no el anfitrión técnico (p. ej.
   * con dos pestañas de admin abiertas). Su cambio viaja con versión más alta
   * y la sala entera lo adopta.
   */
  const canModerate = role === 'admin' || isHost

  const vote = useCallback(
    (optionId: string) => {
      if (state.phase !== 'voting' || role !== 'player') return
      if (!scene) return
      const allowed = votableOptions(story, stateRef.current, scene)
      if (!allowed.some((option) => option.id === optionId)) return
      const current = stateRef.current
      setMyVoteEntry({ key: `${current.sceneId}#${current.round}`, optionId })
    },
    [state.phase, role, scene]
  )

  /** El facilitador fuerza una opción: empates o destrabar la conversación. */
  const decide = useCallback(
    (optionId: string) => {
      if (!canModerate || !scene) return
      if (!scene.options.some((option) => option.id === optionId)) return
      commit(forceOption(story, stateRef.current, optionId, Date.now()))
    },
    [canModerate, scene, commit]
  )

  const closeVoteNow = useCallback(() => {
    if (!canModerate || stateRef.current.phase !== 'voting') return
    commit({ ...stateRef.current, paused: false, deadline: Date.now() })
  }, [canModerate, commit])

  const repeatVote = useCallback(() => {
    if (!canModerate) return
    const current = stateRef.current
    commit({
      ...current,
      phase: 'voting',
      round: current.round + 1,
      winner: null,
      paused: false,
      tiedOptions: null,
      repeatReason: null,
      deadline: 0,
    })
  }, [canModerate, commit])

  /** Pausa el cierre de la votación; los votos siguen abiertos. */
  const pauseVote = useCallback(() => {
    if (!canModerate || stateRef.current.phase !== 'voting') return
    commit({ ...stateRef.current, paused: true, deadline: 0 })
  }, [canModerate, commit])

  const resumeVote = useCallback(() => {
    if (!canModerate || !stateRef.current.paused) return
    commit({ ...stateRef.current, paused: false, deadline: 0 })
  }, [canModerate, commit])

  /** Salto directo a una escena (facilitador). */
  const jumpTo = useCallback(
    (sceneId: string) => {
      if (!canModerate) return
      commit(jumpToScene(story, stateRef.current, sceneId, Date.now()))
    },
    [canModerate, commit]
  )

  const restart = useCallback(() => {
    if (!canModerate) return
    commit(initialState(story, Date.now()))
  }, [canModerate, commit])

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
    ties: state.ties,
    factsDiscovered: state.memory.length,
  }

  /** La memoria del equipo: hechos descubiertos, en orden. */
  const memory: Fact[] = useMemo(
    () =>
      state.memory
        .map((id) => story.factsById[id])
        .filter((fact): fact is Fact => Boolean(fact)),
    [state.memory]
  )

  return {
    story,
    pid,
    role,
    scene,
    options,
    status,
    phase: state.phase,
    round: state.round,
    paused: state.paused,
    tiedOptions: state.tiedOptions,
    repeatReason: state.repeatReason,
    voteSeconds: story.timers.voteSeconds,
    voteSecondsLeft:
      state.deadline > 0 ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null,
    elapsedSeconds,
    pastDeadline,
    metrics,
    memory,
    route: state.route,
    decisionLog: state.log,
    players,
    pendingPlayers,
    admin,
    isHost,
    canModerate,
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
    pauseVote,
    resumeVote,
    jumpTo,
    restart,
  }
}

export type Game = ReturnType<typeof useGame>
