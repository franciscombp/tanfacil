import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { getSession, getCurrentVote, playerHasVoted } from '@/lib/gameService'
import { useVoteMonitor } from '@/hooks/useVoteMonitor'
import { Scene } from '@/types/game'
import VotingPanel from '@/components/VotingPanel'
import SceneView from '@/components/SceneView'
import VoteProgressPanel from '@/components/VoteProgressPanel'
import VoteResultsPanel from '@/components/VoteResultsPanel'
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
  const setCurrentVote = useGameStore((s) => s.setCurrentVote)
  const setPlayerVoted = useGameStore((s) => s.setPlayerVoted)

  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [currentVote, setCurrentVoteLocal] = useState<any>(null)
  const [playerVoted, setPlayerVotedLocal] = useState(false)
  const [loading, setLoading] = useState(true)

  const voteStats = useVoteMonitor(currentVote?.id || null)

  useEffect(() => {
    if (!sessionCode || !playerId) {
      navigate('/join')
      return
    }

    setupGameListener()
  }, [sessionCode, playerId])

  useEffect(() => {
    // Check if player already voted
    if (currentVote && playerId) {
      checkIfPlayerVoted()
    }
  }, [currentVote, playerId])

  const checkIfPlayerVoted = async () => {
    if (!currentVote) return
    const hasVoted = await playerHasVoted(currentVote.id, playerId!)
    setPlayerVotedLocal(hasVoted)
    setPlayerVoted(hasVoted)
  }

  const setupGameListener = async () => {
    try {
      const sessionData = await getSession(sessionCode!)
      if (!sessionData) throw new Error('Session not found')

      // Load initial scene
      const scene = MOCK_SCENES[sessionData.current_scene_id || 'scene_001'] || MOCK_SCENES.scene_001
      setCurrentScene(scene)

      // Check for current vote
      const vote = await getCurrentVote(sessionData.id)
      if (vote) {
        setCurrentVoteLocal(vote)
        setCurrentVote(vote)
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
            setCurrentVoteLocal(null)
            setPlayerVotedLocal(false)
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
            filter: `session_id=eq.${sessionData.id}`,
          },
          async () => {
            const vote = await getCurrentVote(sessionData.id)
            if (vote) {
              setCurrentVoteLocal(vote)
              setCurrentVote(vote)
            } else {
              setCurrentVoteLocal(null)
              setCurrentVote(null)
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

        {currentVote && currentVote.status === 'open' && !playerVoted ? (
          <>
            <VotingPanel scene={currentScene} />
            {voteStats && (
              <VoteProgressPanel
                totalPlayers={voteStats.totalPlayers}
                votedCount={voteStats.votedCount}
              />
            )}
          </>
        ) : playerVoted && currentVote && currentVote.status === 'open' ? (
          <>
            <div className="voting-submitted">
              <p>Tu decisión está registrada. Espera a que termine la votación.</p>
            </div>
            {voteStats && (
              <VoteProgressPanel
                totalPlayers={voteStats.totalPlayers}
                votedCount={voteStats.votedCount}
              />
            )}
          </>
        ) : currentVote && currentVote.status === 'closed' && voteStats ? (
          <VoteResultsPanel
            vote={currentVote}
            options={voteStats.options}
            winnerOptionId={currentVote.winner_option_id}
            onContinue={() => {}}
            loading={false}
          />
        ) : null}
      </div>
    </div>
  )
}
