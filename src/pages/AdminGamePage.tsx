import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '@/lib/supabase'
import {
  getSession,
  getSessionPlayers,
  openVote,
  getCurrentVote,
  updateSceneId,
  logEvent,
} from '@/lib/gameService'
import AdminVoteControl from '@/components/AdminVoteControl'
import { Scene } from '@/types/game'
import './pages.css'

// Mock scenes
const MOCK_SCENES: Record<string, Scene> = {
  scene_001: {
    id: 'scene_001',
    type: 'vote',
    image: '/images/clock-beam.png',
    text: 'El jefe pidió arreglar el reloj antes de las 12:00.',
    options: [
      { id: 'solve_now', label: 'Solucionarlo', nextScene: 'scene_002' },
      { id: 'think', label: 'Déjame pensarlo', nextScene: 'scene_003' },
    ],
  },
  scene_002: {
    id: 'scene_002',
    type: 'reveal',
    image: '/images/painted-half-clock.png',
    text: 'La forma del reloj está completa.',
    options: [
      { id: 'remove_beam', label: 'Quitar la viga', nextScene: 'scene_beam_warning' },
      { id: 'move_clock', label: 'Mover el reloj', nextScene: 'scene_hole_reveal' },
      { id: 'erase_paint', label: 'Borrar la pintura', nextScene: 'scene_paint_cleanup' },
      { id: 'think_again', label: 'Déjame pensarlo', nextScene: 'scene_003' },
    ],
  },
  scene_003: {
    id: 'scene_003',
    type: 'investigation',
    image: '/images/clock-close.png',
    text: 'Todavía no has tocado nada.',
    options: [
      { id: 'look_clock', label: 'Mirar el reloj', nextScene: 'scene_003' },
      { id: 'check_wall', label: 'Revisar la pared', nextScene: 'scene_003' },
      { id: 'ask_history', label: 'Preguntar qué había antes', nextScene: 'scene_003' },
      { id: 'act', label: 'Actuar de todas formas', nextScene: 'scene_002' },
    ],
  },
}

export default function AdminGamePage() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState<any>(null)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [currentVote, setCurrentVote] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionCode) {
      navigate('/admin')
      return
    }

    setupAdmin()
  }, [sessionCode])

  const setupAdmin = async () => {
    try {
      const sessionData = await getSession(sessionCode!)
      if (!sessionData) throw new Error('Session not found')

      setSession(sessionData)

      const sceneId = sessionData.current_scene_id || 'scene_001'
      const scene = MOCK_SCENES[sceneId]
      setCurrentScene(scene)

      await fetchPlayers(sessionData.id)
      await fetchCurrentVote(sessionData.id)

      setLoading(false)

      // Subscribe to session changes
      supabase
        .channel(`session-admin:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `session_code=eq.${sessionCode}`,
          },
          (payload: any) => {
            setSession(payload.new)
            const scene = MOCK_SCENES[payload.new.current_scene_id]
            if (scene) {
              setCurrentScene(scene)
            }
          }
        )
        .subscribe()

      // Subscribe to votes
      const currentSessionId = sessionData.id
      supabase
        .channel(`votes-admin:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `session_id=eq.${currentSessionId}`,
          },
          () => {
            fetchCurrentVote(currentSessionId)
          }
        )
        .subscribe()

      // Subscribe to players
      supabase
        .channel(`players-admin:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `session_id=eq.${currentSessionId}`,
          },
          () => {
            fetchPlayers(currentSessionId)
          }
        )
        .subscribe()
    } catch (err) {
      console.error(err)
      navigate('/admin')
    }
  }

  const fetchPlayers = async (sessionId: string) => {
    const playersList = await getSessionPlayers(sessionId)
    setPlayers(playersList)
  }

  const fetchCurrentVote = async (sessionId: string) => {
    const vote = await getCurrentVote(sessionId)
    setCurrentVote(vote)
  }

  const handleOpenVote = async () => {
    if (!session || !currentScene || currentVote) return

    const options = currentScene.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
    }))

    const vote = await openVote(session.id, currentScene.id, options)
    if (vote) {
      setCurrentVote(vote)
      await logEvent(session.id, 'vote_opened', {
        scene_id: currentScene.id,
      })
    }
  }

  const handleVoteClosed = async (winnerOptionId: string) => {
    if (!session || !currentScene || !currentVote) return

    // Find next scene
    const winnerOption = currentScene.options.find((opt) => opt.id === winnerOptionId)
    const nextSceneId = winnerOption?.nextScene || currentScene.id

    // Update scene
    const success = await updateSceneId(session.id, nextSceneId)
    if (success) {
      // Log event
      await logEvent(session.id, 'scene_changed', {
        from_scene: currentScene.id,
        to_scene: nextSceneId,
        winning_option: winnerOptionId,
      })

      // Reset vote state
      setCurrentVote(null)
    }
  }

  if (loading) {
    return (
      <div className="page page-admin-game">
        <div className="container flex-center" style={{ height: '100vh' }}>
          Cargando...
        </div>
      </div>
    )
  }

  return (
    <div className="page page-admin-game">
      <div className="container">
        <div className="admin-game-header">
          <h1>Control de administrador</h1>
          <div className="admin-game-code">{sessionCode}</div>
          <button
            className="btn-secondary"
            onClick={() => {
              navigate('/admin')
            }}
          >
            Volver
          </button>
        </div>

        <div className="admin-game-content">
          <div className="admin-panel-section">
            <h2>Escena actual</h2>
            <div className="scene-info">
              <p className="scene-title">{currentScene?.text}</p>
              <div className="scene-options-list">
                {currentScene?.options.map((opt) => (
                  <div key={opt.id} className="scene-option-item">
                    → {opt.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-panel-section">
            <h2>Jugadores conectados</h2>
            <div className="players-status">
              <p className="player-count">{players.length} jugadores</p>
              <div className="players-list-admin">
                {players.map((player) => (
                  <div key={player.id} className="player-item">
                    {player.display_name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-panel-section">
            <h2>Votación</h2>
            {!currentVote ? (
              <button className="btn-primary" onClick={handleOpenVote}>
                Abrir votación
              </button>
            ) : (
              <AdminVoteControl
                voteId={currentVote.id}
                onVoteClosed={handleVoteClosed}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
