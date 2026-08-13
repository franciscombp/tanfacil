import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from './supabase'
import {
  CARDS_BY_ID,
  CHECKPOINTS,
  CLOCK,
  CONCLUSION,
  COSTS,
  DECK,
  START_SCENE,
  STORY_SCENES,
  VOTE_SECONDS,
  costOf,
  type Card,
  type SlotId,
} from '@/data/storyData'
import { Scene, SceneOption } from '@/types/game'

/**
 * Sala única del POC.
 *
 * Sincronización con Supabase Realtime Presence: no requiere tablas ni RLS.
 * El anfitrión es el admin (quien entra por /admin) y es el único que ejecuta
 * el motor del juego; el resto replica su estado. Si no hay admin conectado, el
 * jugador más antiguo hace de anfitrión para que la partida no se bloquee.
 *
 * Reglas de votación:
 * - Un minuto para votar cada decisión (configurable en story.json).
 * - El voto se puede cambiar mientras la votación siga abierta.
 * - Al cerrarse: si hay empate decide el admin; si no hay admin, se repite.
 */
const ROOM = 'room:poc-session-001'

/** Tiempo que se muestran los resultados antes de aplicar la decisión. */
export const REVEAL_MS = 4000

/** Margen que queda abierto cuando ya han votado todos (permite rectificar). */
const ALL_VOTED_GRACE_MS = 5000

const CONNECT_TIMEOUT_MS = 10000
const VOTE_MS = VOTE_SECONDS * 1000

export type RoomRole = 'player' | 'admin'
export type RoomPhase = 'voting' | 'reveal' | 'tie'

interface Snapshot {
  sceneId: string
  drawn: string[]
  checkpoints: string[]
  secondsLeft: number
}

/** Estado de la partida: lo publica el anfitrión y el resto lo replica. */
interface SharedState {
  sceneId: string
  round: number
  phase: RoomPhase
  /** Fin de la fase actual (epoch ms). 0 = sin límite. */
  deadline: number
  winner: string | null
  /** Momento en que el reloj marcará las 12:00 (epoch ms). */
  clockDeadline: number
  /** Cartas reveladas, en orden. */
  drawn: string[]
  lastCard: string | null
  checkpoints: string[]
  saved: Snapshot | null
  version: number
}

export interface RoomMember extends SharedState {
  pid: string
  name: string
  role: RoomRole
  joinedAt: number
  vote: string | null
}

export type RoomStatus = 'connecting' | 'connected' | 'offline'

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

function pickHost(members: RoomMember[]): RoomMember | null {
  const admins = members.filter((m) => m.role === 'admin').sort(bySeniority)
  if (admins.length > 0) return admins[0]
  return members.filter((m) => m.role === 'player').sort(bySeniority)[0] ?? null
}

/** Tiempo mínimo al volver de un desvío: si no, se volvería a las 12:00 en bucle. */
const MIN_SECONDS_ON_RETURN = 120

/** Siempre hay un punto al que volver, aunque no se haya activado ninguno aún. */
function initialSnapshot(): Snapshot {
  return {
    sceneId: START_SCENE,
    drawn: [],
    checkpoints: [],
    secondsLeft: CLOCK.secondsAvailable,
  }
}

function initialState(): SharedState {
  const now = Date.now()
  return {
    sceneId: START_SCENE,
    round: 0,
    phase: 'voting',
    deadline: now + VOTE_MS,
    winner: null,
    clockDeadline: now + CLOCK.secondsAvailable * 1000,
    drawn: [],
    lastCard: null,
    checkpoints: [],
    saved: initialSnapshot(),
    version: 0,
  }
}

/**
 * Azar controlado: se reparte por rondas para que las cartas importantes no
 * salgan todas al final y ninguna partida quede bloqueada por suerte.
 */
function drawCard(slot: SlotId, drawn: string[]): Card | null {
  const available = DECK.filter((c) => !drawn.includes(c.id))
  const inSlot = available.filter((c) => c.slot === slot)
  if (inSlot.length === 0) return available[0] ?? null

  const currentRound = Math.min(3, 1 + Math.floor(drawn.length / 4))
  const eligible = inSlot.filter((c) => c.round <= currentRound)
  const pool = eligible.length > 0 ? eligible : inSlot

  // Primero las cartas clave de la ronda más baja, para que la historia avance.
  const minRound = Math.min(...pool.map((c) => c.round))
  const front = pool.filter((c) => c.round === minRound)
  return front[Math.floor(Math.random() * front.length)] ?? null
}

/** Checkpoints que se cumplen con las cartas reveladas. */
function checkpointsFor(drawn: string[]): string[] {
  return CHECKPOINTS.filter((checkpoint) => {
    if (checkpoint.whenCard) return drawn.includes(checkpoint.whenCard)
    if (checkpoint.whenCards) {
      return checkpoint.whenCards.every((id) => drawn.includes(id))
    }
    return false
  }).map((checkpoint) => checkpoint.id)
}

/** Apartados del tablero que ya tienen una evidencia clave. */
function solvedSlots(drawn: string[]): SlotId[] {
  const slots = new Set<SlotId>()
  for (const id of drawn) {
    const card = CARDS_BY_ID[id]
    if (card?.key) slots.add(card.slot)
  }
  return [...slots]
}

export function useGameRoom(displayName: string, role: RoomRole = 'player') {
  const [members, setMembers] = useState<RoomMember[]>([])
  const [state, setState] = useState<SharedState>(initialState)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>(
    isSupabaseConfigured ? 'connecting' : 'offline'
  )
  const [now, setNow] = useState(() => Date.now())

  const pid = useMemo(() => getPersistentId(role), [role])
  const joinedAt = useMemo(() => getJoinedAt(role), [role])

  /** Sube en cada reintento de conexión y fuerza recrear el canal. */
  const [retry, setRetry] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const adoptedRef = useRef(false)
  const roundKeyRef = useRef('')

  const selfRef = useRef({ displayName, state, myVote })
  selfRef.current = { displayName, state, myVote }

  const track = useCallback(() => {
    if (!channelRef.current || !subscribedRef.current) return
    const { displayName, state, myVote } = selfRef.current
    void channelRef.current.track({
      pid,
      name: displayName,
      role,
      joinedAt,
      vote: myVote,
      ...state,
    })
  }, [pid, role, joinedAt])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
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

    const scheduleRejoin = (reason: string) => {
      if (rejoin) return
      console.info(`[sala] ${reason}: reintentando en ${backoff / 1000}s`)
      rejoin = setTimeout(() => setRetry((r) => r + 1), backoff)
    }

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: pid } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const presence = channel.presenceState<RoomMember>()
        const list = Object.values(presence)
          .map((entries) => entries[0])
          .filter((entry) => Boolean(entry && entry.pid))
          .map((entry) => ({
            pid: entry.pid,
            name: entry.name,
            role: entry.role === 'admin' ? ('admin' as const) : ('player' as const),
            joinedAt: entry.joinedAt,
            vote: entry.vote ?? null,
            sceneId: entry.sceneId ?? START_SCENE,
            round: entry.round ?? 0,
            phase: entry.phase ?? 'voting',
            deadline: entry.deadline ?? 0,
            winner: entry.winner ?? null,
            clockDeadline: entry.clockDeadline ?? 0,
            drawn: entry.drawn ?? [],
            lastCard: entry.lastCard ?? null,
            checkpoints: entry.checkpoints ?? [],
            saved: entry.saved ?? null,
            version: entry.version ?? 0,
          }))
          .sort(bySeniority)
        setMembers(list)
      })
      .subscribe((subscription) => {
        if (subscription === 'SUBSCRIBED') {
          subscribedRef.current = true
          setStatus('connected')
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

    // Al volver a la pestaña, reconectar sin esperar al backoff.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !subscribedRef.current) {
        setRetry((r) => r + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      clearTimeout(timeout)
      if (rejoin) clearTimeout(rejoin)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      subscribedRef.current = false
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [pid, track, retry])

  useEffect(() => {
    track()
  }, [displayName, state, myVote, track])

  const roster = useMemo<RoomMember[]>(() => {
    if (members.some((m) => m.pid === pid)) return members
    const self: RoomMember = {
      pid,
      name: displayName,
      role,
      joinedAt,
      vote: myVote,
      ...state,
    }
    return [...members, self].sort(bySeniority)
  }, [members, pid, displayName, role, joinedAt, myVote, state])

  const host = useMemo(() => pickHost(roster), [roster])
  const isHost = host?.pid === pid
  const admin = useMemo(() => roster.find((m) => m.role === 'admin') ?? null, [roster])

  const setShared = useCallback((patch: Partial<SharedState>) => {
    setState((current) => ({ ...current, ...patch, version: current.version + 1 }))
  }, [])

  // El anfitrión manda; el resto replica.
  useEffect(() => {
    if (!host) return

    if (host.pid === pid) {
      if (adoptedRef.current) return
      adoptedRef.current = true
      const latest = roster
        .filter((m) => m.pid !== pid)
        .sort((a, b) => b.version - a.version)[0]
      if (latest && latest.version > state.version) {
        const { pid: _p, name: _n, role: _r, joinedAt: _j, vote: _v, ...shared } = latest
        setState(shared)
      }
      return
    }

    if (host.version !== state.version || host.sceneId !== state.sceneId) {
      const { pid: _p, name: _n, role: _r, joinedAt: _j, vote: _v, ...shared } = host
      setState(shared)
    }
  }, [host, pid, roster, state])

  // Al cambiar de escena o repetirse la votación se limpia el voto propio.
  useEffect(() => {
    const key = `${state.sceneId}#${state.round}`
    if (roundKeyRef.current && roundKeyRef.current !== key) setMyVote(null)
    roundKeyRef.current = key
  }, [state.sceneId, state.round])

  const baseScene = STORY_SCENES[state.sceneId] ?? null

  const secondsLeft = Math.max(0, Math.ceil((state.clockDeadline - now) / 1000))
  const missingSlots = useMemo(() => {
    const solved = solvedSlots(state.drawn)
    return CONCLUSION.requiredSlots.filter((slot) => !solved.includes(slot))
  }, [state.drawn])
  const canConclude = missingSlots.length === 0

  /** En el tablero aparece una opción extra cuando la evidencia ya se sostiene. */
  const scene = useMemo<Scene | null>(() => {
    if (!baseScene) return null
    if (baseScene.mode !== 'investigate' || !canConclude) return baseScene
    const concludeOption: SceneOption = {
      id: '__conclude',
      label: 'Sacar conclusiones',
      next: CONCLUSION.sceneId,
      nextScene: CONCLUSION.sceneId,
    }
    return { ...baseScene, options: [concludeOption, ...baseScene.options] }
  }, [baseScene, canConclude])

  // Sólo votan los jugadores; el admin modera.
  const players = useMemo(() => roster.filter((m) => m.role === 'player'), [roster])
  const playersHere = useMemo(
    () => players.filter((p) => p.sceneId === state.sceneId),
    [players, state.sceneId]
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
  const everyoneVoted = playersHere.length > 0 && votedCount === playersHere.length

  const leaders = useMemo(() => {
    if (!scene || scene.options.length === 0) return []
    const max = Math.max(...scene.options.map((o) => voteCounts[o.id] ?? 0))
    if (max === 0) return []
    return scene.options.filter((o) => (voteCounts[o.id] ?? 0) === max)
  }, [scene, voteCounts])

  const isTie = leaders.length > 1

  /** Aplica la decisión ganadora: coste, carta, checkpoint y escena siguiente. */
  const applyOption = useCallback(
    (optionId: string) => {
      if (!scene) return
      const option = scene.options.find((o) => o.id === optionId)
      if (!option) return

      const at = Date.now()
      let clockDeadline = state.clockDeadline
      let drawn = state.drawn
      let lastCard: string | null = null
      let sceneId = option.next ?? scene.id
      let saved = state.saved

      if (option.returnToCheckpoint) {
        // Volver atrás con lo aprendido: las cartas reveladas no se pierden.
        const point = saved ?? initialSnapshot()
        sceneId = point.sceneId
        lastCard = null
        clockDeadline =
          at +
          Math.max(
            MIN_SECONDS_ON_RETURN,
            point.secondsLeft - COSTS.checkpoint
          ) *
            1000
      } else {
        clockDeadline -= costOf(option) * 1000
        if (option.forceNoon) clockDeadline = at

        if (option.draw) {
          const card = drawCard(option.draw as SlotId, drawn)
          if (card) {
            drawn = [...drawn, card.id]
            lastCard = card.id
          }
        }
      }

      const checkpoints = [
        ...new Set([...state.checkpoints, ...checkpointsFor(drawn)]),
      ]
      const nextScene = STORY_SCENES[sceneId]
      if (nextScene?.checkpoint) checkpoints.push(nextScene.checkpoint)

      const remaining = Math.max(0, Math.ceil((clockDeadline - at) / 1000))

      // Guardar checkpoint: el punto seguro al que volver.
      if (checkpoints.length > state.checkpoints.length && !nextScene?.detour) {
        saved = { sceneId, drawn, checkpoints, secondsLeft: remaining }
      }

      // Se acabó el tiempo: llega el jefe (desvío, no final).
      if (remaining === 0 && !nextScene?.detour && nextScene?.type !== 'ending') {
        sceneId = 'desvio_jefe'
      }

      setShared({
        sceneId,
        round: 0,
        phase: 'voting',
        winner: null,
        deadline: at + VOTE_MS,
        clockDeadline,
        drawn,
        lastCard,
        checkpoints: [...new Set(checkpoints)],
        saved,
      })
    },
    [scene, state, setShared]
  )

  const resolveVote = useCallback(() => {
    if (!scene) return

    if (leaders.length === 1) {
      setShared({
        phase: 'reveal',
        winner: leaders[0].id,
        deadline: Date.now() + REVEAL_MS,
      })
      return
    }

    // Empate (o nadie votó): decide el admin; si no hay, se repite la votación.
    if (admin) {
      setShared({ phase: 'tie', winner: null, deadline: 0 })
    } else {
      setShared({
        phase: 'voting',
        round: state.round + 1,
        winner: null,
        deadline: Date.now() + VOTE_MS,
      })
    }
  }, [scene, leaders, admin, state.round, setShared])

  // Motor de la partida: sólo lo ejecuta el anfitrión.
  useEffect(() => {
    if (!isHost || !scene) return

    if (state.phase === 'voting') {
      if (scene.options.length === 0) return
      if (everyoneVoted && state.deadline > now + ALL_VOTED_GRACE_MS) {
        setShared({ deadline: now + ALL_VOTED_GRACE_MS })
        return
      }
      if (now >= state.deadline) resolveVote()
      return
    }

    if (state.phase === 'reveal' && now >= state.deadline && state.winner) {
      applyOption(state.winner)
    }
  }, [
    isHost,
    scene,
    state.phase,
    state.deadline,
    state.winner,
    everyoneVoted,
    now,
    resolveVote,
    applyOption,
    setShared,
  ])

  // El reloj también corre solo: al llegar a las 12:00 aparece el jefe.
  useEffect(() => {
    if (!isHost || !scene) return
    if (secondsLeft > 0) return
    if (scene.detour || scene.type === 'ending' || scene.id === 'desvio_jefe') return
    setShared({
      sceneId: 'desvio_jefe',
      round: 0,
      phase: 'voting',
      winner: null,
      deadline: Date.now() + VOTE_MS,
    })
  }, [isHost, scene, secondsLeft, setShared])

  const vote = useCallback(
    (optionId: string) => {
      if (state.phase !== 'voting') return
      setMyVote(optionId)
    },
    [state.phase]
  )

  const closeVoteNow = useCallback(() => {
    if (!isHost || state.phase !== 'voting') return
    setShared({ deadline: Date.now() })
  }, [isHost, state.phase, setShared])

  /** Elige una opción y avanza (sólo anfitrión). Resuelve también los empates. */
  const advance = useCallback(
    (optionId?: string) => {
      if (!isHost || !scene) return
      const chosen = optionId ?? leaders[0]?.id
      if (!chosen || !scene.options.some((o) => o.id === chosen)) return
      setShared({
        phase: 'reveal',
        winner: chosen,
        deadline: Date.now() + REVEAL_MS,
      })
    },
    [isHost, scene, leaders, setShared]
  )

  const repeatVote = useCallback(() => {
    if (!isHost) return
    setShared({
      phase: 'voting',
      round: state.round + 1,
      winner: null,
      deadline: Date.now() + VOTE_MS,
    })
  }, [isHost, state.round, setShared])

  const restart = useCallback(() => {
    if (!isHost) return
    setState({ ...initialState(), version: state.version + 1 })
  }, [isHost, state.version])

  const voteSecondsLeft =
    state.deadline > 0 ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null

  /** Cartas reveladas agrupadas por apartado del tablero. */
  const board = useMemo(() => {
    const grouped: Record<string, Card[]> = {}
    for (const id of state.drawn) {
      const card = CARDS_BY_ID[id]
      if (!card) continue
      grouped[card.slot] = [...(grouped[card.slot] ?? []), card]
    }
    return grouped
  }, [state.drawn])

  return {
    pid,
    scene,
    status,
    phase: state.phase,
    round: state.round,
    voteSecondsLeft,
    voteSeconds: VOTE_SECONDS,
    /** Minutos y segundos que faltan para las 12:00. */
    secondsLeft,
    board,
    drawnCount: state.drawn.length,
    lastCard: state.lastCard ? (CARDS_BY_ID[state.lastCard] ?? null) : null,
    checkpoints: state.checkpoints,
    savedCheckpoint: state.saved,
    canConclude,
    missingSlots,
    players: playersHere.length > 0 ? playersHere : players,
    pendingPlayers,
    admin,
    isHost,
    myVote,
    vote,
    advance,
    closeVoteNow,
    repeatVote,
    restart,
    voteCounts,
    votedCount,
    totalCount: playersHere.length,
    everyoneVoted,
    isTie,
    leaders,
    winnerOptionId: state.winner,
  }
}
