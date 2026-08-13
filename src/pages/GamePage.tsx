import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
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
  const currentVote = useGameStore((s) => s.currentVote)
  const playerVoted = useGameStore((s) => s.playerVoted)

  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionCode) return

    loadInitialScene()
  }, [sessionCode])

  const loadInitialScene = async () => {
    try {
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single()

      if (sessionData?.current_scene_id) {
        const scene = MOCK_SCENES[sessionData.current_scene_id] || MOCK_SCENES.scene_001
        setCurrentScene(scene)
      } else {
        setCurrentScene(MOCK_SCENES.scene_001)
      }

      setLoading(false)
    } catch (err) {
      console.error(err)
      setCurrentScene(MOCK_SCENES.scene_001)
      setLoading(false)
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
