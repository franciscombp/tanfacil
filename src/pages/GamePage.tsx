import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { getSession, getCurrentVote } from '@/lib/gameService'
import { Scene } from '@/types/game'
import VotingPanel from '@/components/VotingPanel'
import SceneView from '@/components/SceneView'
import './pages.css'

// Mock scenes for now
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

export default function GamePage() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()

  const playerId = useGameStore((s) => s.playerId)
  const currentVote = useGameStore((s) => s.currentVote)
  const playerVoted = useGameStore((s) => s.playerVoted)
  const setCurrentVote = useGameStore((s) => s.setCurrentVote)
  const setPlayerVoted = useGameStore((s) => s.setPlayerVoted)

  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionCode || !playerId) {
      navigate('/join')
      return
    }

    setupGameListener()
  }, [sessionCode, playerId])

  const setupGameListener = async () => {
    try {
      const session = await getSession(sessionCode!)
      if (!session) throw new Error('Session not found')

      // Load initial scene
      const scene = MOCK_SCENES[session.current_scene_id || 'scene_001'] || MOCK_SCENES.scene_001
      setCurrentScene(scene)

      // Check for current vote
      const vote = await getCurrentVote(session.id)
      if (vote) {
        setCurrentVote(vote)
        // Check if player already voted
        const hasVoted = vote && currentVote?.id
        if (hasVoted) {
          setPlayerVoted(true)
        }
      }

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
            filter: `session_code=eq.${sessionCode}`,
          },
          (payload: any) => {
            const newSceneId = payload.new.current_scene_id
            const scene = MOCK_SCENES[newSceneId] || MOCK_SCENES.scene_001
            setCurrentScene(scene)
          }
        )
        .subscribe()

      // Subscribe to votes changes
      supabase
        .channel(`votes:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `session_code=eq.${sessionCode}`,
          },
          async () => {
            const vote = await getCurrentVote(session.id)
            if (vote) {
              setCurrentVote(vote)
            }
          }
        )
        .subscribe()
    } catch (err) {
      console.error(err)
      navigate('/join')
    }
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

  return (
    <div className="page page-game">
      <div className="container">
        <SceneView scene={currentScene} />

        {currentVote && !playerVoted ? (
          <VotingPanel scene={currentScene} />
        ) : playerVoted && currentVote ? (
          <div className="voting-submitted">
            <p>Tu decisión está registrada. Espera a que termine la votación.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
