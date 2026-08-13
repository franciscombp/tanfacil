import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { getSession, registerPlayer, getSessionPlayers } from '@/lib/gameService'
import './pages.css'

export default function LobbyPage() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()

  const setSession = useGameStore((s) => s.setSession)
  const playerId = useGameStore((s) => s.playerId)
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)
  const players = useGameStore((s) => s.players)
  const setPlayers = useGameStore((s) => s.setPlayers)
  const setIsConnected = useGameStore((s) => s.setIsConnected)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionCode || !playerDisplayName || !playerId) {
      navigate('/join')
      return
    }

    setupPlayer()
  }, [sessionCode, playerDisplayName, playerId])

  const setupPlayer = async () => {
    try {
      // Fetch session
      const session = await getSession(sessionCode!)
      if (!session) throw new Error('Session not found')

      setSession(session)

      // Register player
      await registerPlayer(session.id, playerId!, playerDisplayName)

      // Fetch initial players
      await fetchPlayers(session.id)
      setIsConnected(true)
      setLoading(false)

      // Subscribe to players changes
      const playersChannel = supabase
        .channel(`players:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `session_id=eq.${session.id}`,
          },
          () => {
            fetchPlayers(session.id)
          }
        )
        .subscribe()

      // Subscribe to session changes
      supabase
        .channel(`session:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${session.id}`,
          },
          (payload: any) => {
            if (payload.new.status === 'running') {
              navigate(`/game/${sessionCode}`)
            }
          }
        )
        .subscribe()

      return () => {
        playersChannel.unsubscribe()
      }
    } catch (err) {
      console.error(err)
      navigate('/join')
    }
  }

  const fetchPlayers = async (sessionId: string) => {
    const playersList = await getSessionPlayers(sessionId)
    setPlayers(playersList)
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
