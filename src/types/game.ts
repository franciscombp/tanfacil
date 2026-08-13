export interface GameSession {
  id: string
  session_code: string
  status: 'lobby' | 'running' | 'ended'
  current_scene_id: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  session_id: string
  player_id: string
  display_name: string
  connected: boolean
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  session_id: string
  scene_id: string
  status: 'open' | 'closed'
  options: VoteOption[]
  total_players_at_open: number | null
  created_at: string
  closed_at: string | null
  winner_option_id: string | null
}

export interface VoteOption {
  id: string
  label: string
  votes_count: number
}

export interface PlayerVote {
  id: string
  vote_id: string
  player_id: string
  option_id: string
  created_at: string
}

export interface Clue {
  id: string
  session_id: string
  clue_id: string
  category: 'clock' | 'wall' | 'history' | 'present' | 'noise'
  text: string
  discovered_at: string
}

export interface Checkpoint {
  id: string
  session_id: string
  scene_id: string
  clue_ids: string[]
  game_time_seconds: number
  created_at: string
}

export interface GameEvent {
  id: string
  session_id: string
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

export interface Scene {
  id: string
  type: 'vote' | 'reveal' | 'investigation' | 'boss_arrival' | 'ending'
  image: string
  text: string
  options: SceneOption[]
}

export interface SceneOption {
  id: string
  label: string
  nextScene: string
}
