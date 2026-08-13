import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { registerPlayer, getSessionPlayers, openVote, submitVote, closeVote, updateSceneId } from '@/lib/gameService'
import { STORY_SCENES } from '@/data/storyData'
import { Scene } from '@/types/game'
import SceneView from '@/components/SceneView'
import './pages.css'

const GAME_SESSION_ID = 'poc-session-001' // Sesión única para POC

export default function GamePage() {
  const navigate = useNavigate()
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)
  const playerId = useGameStore((s) => s.playerId)
  const setPlayerId = useGameStore((s) => s.setPlayerId)

  const [currentSceneId, setCurrentSceneId] = useState<string>('scene_001')
  const currentScene: Scene | null = STORY_SCENES[currentSceneId] || null
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentVote, setCurrentVote] = useState<any>(null)
  const [playerHasVoted, setPlayerHasVoted] = useState(false)
  const [votedOption, setVotedOption] = useState<string | null>(null)

  // Inicializar jugador y escenas
  useEffect(() => {
    if (!playerDisplayName) {
      navigate('/')
      return
    }

    initializePlayer()
  }, [playerDisplayName])

  // Suscribirse a cambios de escena y jugadores
  useEffect(() => {
    if (!playerId) return

    subscribeToGameUpdates()
  }, [playerId])

  const initializePlayer = async () => {
    try {
      // Generar un ID único para el jugador
      const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setPlayerId(newPlayerId)

      // Registrar jugador en Supabase
      await registerPlayer(GAME_SESSION_ID, newPlayerId, playerDisplayName)

      // Cargar lista de jugadores
      fetchPlayers()
      setLoading(false)
    } catch (error) {
      console.error('Error inicializando jugador:', error)
      navigate('/')
    }
  }

  const fetchPlayers = async () => {
    try {
      const playersList = await getSessionPlayers(GAME_SESSION_ID)
      setPlayers(playersList)
    } catch (error) {
      console.error('Error cargando jugadores:', error)
    }
  }

  const subscribeToGameUpdates = () => {
    // Suscribirse a cambios de jugadores
    const playersChannel = supabase
      .channel(`players:${GAME_SESSION_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${GAME_SESSION_ID}`,
        },
        () => {
          fetchPlayers()
        }
      )
      .subscribe()

    // Suscribirse a cambios de votación
    const votesChannel = supabase
      .channel(`votes:${GAME_SESSION_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${GAME_SESSION_ID}`,
        },
        () => {
          fetchVoteStatus()
        }
      )
      .subscribe()

    return () => {
      playersChannel.unsubscribe()
      votesChannel.unsubscribe()
    }
  }

  const fetchVoteStatus = async () => {
    try {
      // Aquí iría la lógica para obtener el estado de votación actual
    } catch (error) {
      console.error('Error cargando votación:', error)
    }
  }

  const handleVote = async (optionId: string) => {
    if (!playerId || !currentScene) return

    try {
      // Crear votación si no existe
      if (!currentVote) {
        const vote = await openVote(GAME_SESSION_ID, currentScene.id, currentScene.options)
        setCurrentVote(vote)
      }

      // Registrar voto del jugador
      if (currentVote) {
        await submitVote(currentVote.id, playerId, optionId)
        setVotedOption(optionId)
        setPlayerHasVoted(true)
      }
    } catch (error) {
      console.error('Error votando:', error)
    }
  }

  const handleContinueToNextScene = async (nextSceneId: string) => {
    if (!currentVote) return

    try {
      // Cerrar votación
      await closeVote(currentVote.id, votedOption || '')
      // Actualizar escena
      await updateSceneId(GAME_SESSION_ID, nextSceneId)
      setCurrentSceneId(nextSceneId)
      setCurrentVote(null)
      setPlayerHasVoted(false)
      setVotedOption(null)
    } catch (error) {
      console.error('Error avanzando a siguiente escena:', error)
    }
  }

  const getNextSceneId = (): string | null => {
    if (!votedOption || !currentScene) return null
    const selectedOption = currentScene.options.find(opt => opt.id === votedOption)
    return selectedOption?.nextScene || null
  }

  if (loading || !currentScene) {
    return (
      <div className="page page-game">
        <div className="container flex-center" style={{ height: '100vh' }}>
          Cargando...
        </div>
      </div>
    )
  }

  const isEndingScene = currentScene.type === 'ending'

  return (
    <div className="page page-game">
      <div className="container">
        {/* TOP BAR */}
        <div className="game-top-bar">
          <div className="game-status">
            <span className="scene-counter">Escena: {currentScene.id}</span>
          </div>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ fontSize: '14px', padding: '8px 16px' }}>
            Salir
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '24px', marginTop: '24px' }}>
          {/* SCENE */}
          <div>
            <SceneView scene={currentScene} />

            {isEndingScene ? (
              <div className="ending-container">
                <div className="ending-text">{currentScene.text}</div>
                <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>
                  Volver al inicio
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '40px' }}>
                <div className="voting-options">
                  {currentScene.options.map((option) => (
                    <button
                      key={option.id}
                      className={`voting-option ${votedOption === option.id ? 'selected' : ''}`}
                      onClick={() => handleVote(option.id)}
                      disabled={playerHasVoted}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {playerHasVoted && getNextSceneId() && (
                  <button
                    className="btn-primary"
                    onClick={() => handleContinueToNextScene(getNextSceneId()!)}
                    style={{ marginTop: '20px', width: '100%' }}
                  >
                    Continuar a la siguiente escena
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PLAYERS LIST */}
          <div className="players-panel">
            <h3>Jugadores ({players.length})</h3>
            <div className="players-list-game">
              {players.map((player) => (
                <div key={player.id} className="player-item-game">
                  <div className="player-name-game">{player.display_name}</div>
                  <div className={`player-vote-status ${playerHasVoted && player.player_id === playerId ? 'voted' : ''}`}>
                    {playerHasVoted && player.player_id === playerId ? '✓ Votó' : '○ Esperando'}
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
