import supabase from './supabase'
import { GameSession, Player, Vote, PlayerVote, Clue, GameEvent } from '@/types/game'

/**
 * Session Management
 */

export async function createSession(): Promise<GameSession | null> {
  try {
    const code = `RELOJ-${Math.floor(Math.random() * 10000)}`

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        session_code: code,
        status: 'lobby',
        current_scene_id: 'scene_001',
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error creating session:', err)
    return null
  }
}

export async function getSession(code: string): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_code', code)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error fetching session:', err)
    return null
  }
}

export async function startSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'running' })
      .eq('id', sessionId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error starting session:', err)
    return false
  }
}

export async function resetSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'lobby', current_scene_id: 'scene_001' })
      .eq('id', sessionId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error resetting session:', err)
    return false
  }
}

export async function updateSceneId(sessionId: string, sceneId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({ current_scene_id: sceneId })
      .eq('id', sessionId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error updating scene:', err)
    return false
  }
}

/**
 * Player Management
 */

export async function registerPlayer(
  sessionId: string,
  playerId: string,
  displayName: string
): Promise<Player | null> {
  try {
    const { data, error } = await supabase
      .from('players')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        display_name: displayName,
        connected: true,
      })
      .select()
      .single()

    if (error) {
      // If duplicate, fetch existing
      if (error.message.includes('duplicate')) {
        return await getPlayer(sessionId, playerId)
      }
      throw error
    }
    return data
  } catch (err) {
    console.error('Error registering player:', err)
    return null
  }
}

export async function getPlayer(
  sessionId: string,
  playerId: string
): Promise<Player | null> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  } catch (err) {
    console.error('Error fetching player:', err)
    return null
  }
}

export async function getSessionPlayers(sessionId: string): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('connected', true)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching players:', err)
    return []
  }
}

/**
 * Vote Management
 */

export async function openVote(
  sessionId: string,
  sceneId: string,
  options: Array<{ id: string; label: string }>
): Promise<Vote | null> {
  try {
    const playerCount = await getSessionPlayers(sessionId)
    const optionsWithCounts = options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      votes_count: 0,
    }))

    const { data, error } = await supabase
      .from('votes')
      .insert({
        session_id: sessionId,
        scene_id: sceneId,
        status: 'open',
        options: optionsWithCounts,
        total_players_at_open: playerCount.length,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error opening vote:', err)
    return null
  }
}

export async function getCurrentVote(sessionId: string): Promise<Vote | null> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  } catch (err) {
    console.error('Error fetching current vote:', err)
    return null
  }
}

export async function submitVote(
  voteId: string,
  playerId: string,
  optionId: string
): Promise<PlayerVote | null> {
  try {
    const { data, error } = await supabase
      .from('player_votes')
      .insert({
        vote_id: voteId,
        player_id: playerId,
        option_id: optionId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error submitting vote:', err)
    return null
  }
}

export async function closeVote(voteId: string, winnerOptionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('votes')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        winner_option_id: winnerOptionId,
      })
      .eq('id', voteId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error closing vote:', err)
    return false
  }
}

export async function getVoteResults(
  voteId: string
): Promise<{ options: Array<any>; winnerOptionId: string | null } | null> {
  try {
    const { data: votes, error: votesError } = await supabase
      .from('player_votes')
      .select('option_id')
      .eq('vote_id', voteId)

    if (votesError) throw votesError

    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .select('*')
      .eq('id', voteId)
      .single()

    if (voteError) throw voteError

    // Count votes per option
    const voteCounts = new Map<string, number>()
    voteData.options.forEach((opt: any) => {
      voteCounts.set(opt.id, 0)
    })

    votes.forEach((vote: any) => {
      voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) || 0) + 1)
    })

    const optionsWithCounts = voteData.options.map((opt: any) => ({
      ...opt,
      votes_count: voteCounts.get(opt.id) || 0,
    }))

    return {
      options: optionsWithCounts,
      winnerOptionId: voteData.winner_option_id,
    }
  } catch (err) {
    console.error('Error fetching vote results:', err)
    return null
  }
}

export async function playerHasVoted(voteId: string, playerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('player_votes')
      .select('id')
      .eq('vote_id', voteId)
      .eq('player_id', playerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      throw error
    }
    return !!data
  } catch (err) {
    console.error('Error checking if player voted:', err)
    return false
  }
}

/**
 * Clues Management
 */

export async function addClue(
  sessionId: string,
  clueId: string,
  category: string,
  text: string
): Promise<Clue | null> {
  try {
    const { data, error } = await supabase
      .from('clues')
      .insert({
        session_id: sessionId,
        clue_id: clueId,
        category,
        text,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error adding clue:', err)
    return null
  }
}

export async function getSessionClues(sessionId: string): Promise<Clue[]> {
  try {
    const { data, error } = await supabase
      .from('clues')
      .select('*')
      .eq('session_id', sessionId)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching clues:', err)
    return []
  }
}

/**
 * Events Management
 */

export async function logEvent(
  sessionId: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<GameEvent | null> {
  try {
    const { data, error } = await supabase
      .from('game_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData || {},
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error logging event:', err)
    return null
  }
}

export async function getSessionEvents(sessionId: string): Promise<GameEvent[]> {
  try {
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching events:', err)
    return []
  }
}
