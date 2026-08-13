import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import './pages.css'

export default function LobbyPage() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()

  const setSession = useGameStore((s) => s.setSession)
  const playerId = useGameStore((s) => s.playerId)
  const setPlayerId = useGameStore((s) => s.setPlayerId)
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)
  const players = useGameStore((s) => s.players)
  const setPlayers = useGameStore((s) => s.setPlayers)
  const setIsConnected = useGameStore((s) => s.setIsConnected)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionCode || !playerDisplayName) {
      navigate('/join')
      return
    }

    setupPlayer()
  }, [sessionCode, playerDisplayName])

  const setupPlayer = async () => {
    try {
      // Get or create anonymous session
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
      if (authError) throw authError

      const userId = authData.session?.user.id
      if (!userId) throw new Error('No user ID')

      setPlayerId(userId)

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Register player
      const { error: playerError } = await supabase.from('players').insert({
        session_id: sessionData.id,
        player_id: userId,
        display_name: playerDisplayName,
        connected: true,
      })

      if (playerError && !playerError.message.includes('duplicate')) throw playerError

      // Subscribe to players
      const channel = supabase
        .channel(`players:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `session_id=eq.${sessionData.id}`,
          },
          () => {
            fetchPlayers(sessionData.id)
          }
        )
        .subscribe()

      await fetchPlayers(sessionData.id)
      setIsConnected(true)
      setLoading(false)

      // Subscribe to session changes
      supabase
        .channel(`session:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${sessionData.id}`,
          },
          (payload: any) => {
            if (payload.new.status === 'running') {
              navigate(`/game/${sessionCode}`)
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    } catch (err) {
      console.error(err)
      navigate('/join')
    }
  }

  const fetchPlayers = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('connected', true)

    if (!error && data) {
      setPlayers(data)
    }
  }

  if (loading) {
    return (
      <div className="page page-lobby">
        <div className="container flex-center" style={{ height: '100vh' }}>
          <div>Conectando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-lobby">
      <div className="container">
        <div className="lobby-header">
          <h1>No es tan fácil</h1>
          <div className="lobby-code">Código: {sessionCode}</div>
        </div>

        <div className="lobby-content">
          <div className="status-section">
            <h2>Esperando que empiece la misión...</h2>
            <p className="player-count">Jugadores conectados: {players.length}</p>
          </div>

          <div className="players-list">
            <h3>Participantes</h3>
            <div className="players-grid">
              {players.map((player) => (
                <div key={player.id} className="player-badge">
                  <div className="player-name">{player.display_name}</div>
                  <div className="player-status">
                    {player.player_id === playerId && <span>Tú</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
