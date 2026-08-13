import { create } from 'zustand'
import { GameSession, Player, Vote, Clue, Checkpoint } from '@/types/game'

interface GameStore {
  // Session
  session: GameSession | null
  setSession: (session: GameSession) => void
  sessionCode: string
  setSessionCode: (code: string) => void

  // Player
  playerId: string | null
  setPlayerId: (id: string) => void
  playerDisplayName: string
  setPlayerDisplayName: (name: string) => void
  players: Player[]
  setPlayers: (players: Player[]) => void

  // Vote
  currentVote: Vote | null
  setCurrentVote: (vote: Vote | null) => void
  playerVoted: boolean
  setPlayerVoted: (voted: boolean) => void
  selectedOption: string | null
  setSelectedOption: (optionId: string | null) => void

  // Clues
  discoveredClues: Clue[]
  addClue: (clue: Clue) => void
  setDiscoveredClues: (clues: Clue[]) => void

  // Checkpoints
  checkpoints: Checkpoint[]
  setCheckpoints: (checkpoints: Checkpoint[]) => void

  // UI
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  error: string | null
  setError: (error: string | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  session: null,
  sessionCode: '',
  playerId: null,
  playerDisplayName: '',
  players: [],
  currentVote: null,
  playerVoted: false,
  selectedOption: null,
  discoveredClues: [],
  checkpoints: [],
  isConnected: false,
  error: null,
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setSession: (session) => set({ session }),
  setSessionCode: (code) => set({ sessionCode: code }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerDisplayName: (name) => set({ playerDisplayName: name }),
  setPlayers: (players) => set({ players }),
  setCurrentVote: (vote) => set({ currentVote: vote }),
  setPlayerVoted: (voted) => set({ playerVoted: voted }),
  setSelectedOption: (optionId) => set({ selectedOption: optionId }),
  addClue: (clue) =>
    set((state) => ({
      discoveredClues: [...state.discoveredClues, clue],
    })),
  setDiscoveredClues: (clues) => set({ discoveredClues: clues }),
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
