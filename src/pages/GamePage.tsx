import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import {
  getSession,
  getCurrentVote,
  playerHasVoted,
  getSessionClues,
  addClue,
  createCheckpoint,
} from '@/lib/gameService'
import { useVoteMonitor } from '@/hooks/useVoteMonitor'
import { STORY_SCENES } from '@/data/storyData'
import { CLUES_DATABASE } from '@/data/cluesData'
import { Scene } from '@/types/game'
import VotingPanel from '@/components/VotingPanel'
import SceneView from '@/components/SceneView'
import VoteProgressPanel from '@/components/VoteProgressPanel'
import VoteResultsPanel from '@/components/VoteResultsPanel'
import ClueBoardPanel from '@/components/ClueBoardPanel'
import './pages.css'

export default function GamePage() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()

  const playerId = useGameStore((s) => s.playerId)
  const setCurrentVote = useGameStore((s) => s.setCurrentVote)
  const setPlayerVoted = useGameStore((s) => s.setPlayerVoted)
  const discoveredClues = useGameStore((s) => s.discoveredClues)
  const addClueToStore = useGameStore((s) => s.addClue)
  const setDiscoveredClues = useGameStore((s) => s.setDiscoveredClues)

  const [session, setSession] = useState<any>(null)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [currentVote, setCurrentVoteLocal] = useState<any>(null)
  const [playerVoted, setPlayerVotedLocal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showClueBoard, setShowClueBoard] = useState(false)

  const voteStats = useVoteMonitor(currentVote?.id || null)

  useEffect(() => {
    if (!sessionCode || !playerId) {
      navigate('/join')
      return
    }

    setupGameListener()
  }, [sessionCode, playerId])

  useEffect(() => {
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

      setSession(sessionData)

      // Load initial scene
      const sceneId = sessionData.current_scene_id || 'scene_001'
      const scene = STORY_SCENES[sceneId]
      setCurrentScene(scene)

      // Load clues from database
      const dbClues = await getSessionClues(sessionData.id)
      setDiscoveredClues(dbClues)

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
            const scene = STORY_SCENES[newSceneId]
            if (scene) {
              setCurrentScene(scene)
              setCurrentVoteLocal(null)
              setPlayerVotedLocal(false)
            }
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

      // Subscribe to clue changes
      supabase
        .channel(`clues:${sessionCode}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'clues',
            filter: `session_id=eq.${sessionData.id}`,
          },
          async () => {
            const updatedClues = await getSessionClues(sessionData.id)
            setDiscoveredClues(updatedClues)
          }
        )
        .subscribe()
    } catch (err) {
      console.error(err)
      navigate('/join')
    }
  }

  const handleRevealClue = async () => {
    if (!session) return

    // Get available clues (that haven't been revealed yet)
    const discoveredIds = discoveredClues.map((c) => c.clue_id)
    const availableClues = CLUES_DATABASE.filter((c) => !discoveredIds.includes(c.id))

    if (availableClues.length === 0) return

    // Pick a random clue
    const randomClue = availableClues[Math.floor(Math.random() * availableClues.length)]

    // Add to database
    await addClue(session.id, randomClue.id, randomClue.category, randomClue.text)

    // Update local state
    addClueToStore({
      id: randomClue.id,
      session_id: session.id,
      clue_id: randomClue.id,
      category: randomClue.category as any,
      text: randomClue.text,
      discovered_at: new Date().toISOString(),
    })
  }

  const handleCreateCheckpoint = async () => {
    if (!session || !currentScene) return

    const clueIdsArray = discoveredClues.map((c) => c.clue_id)
    await createCheckpoint(session.id, currentScene.id, clueIdsArray, 0)
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

  const isInvestigationScene = currentScene.type === 'investigation'
  const isEndingScene = currentScene.type === 'ending'

  return (
    <div className="page page-game">
      <div className="container">
        <div className="game-top-bar">
          <div className="game-status">
            <span className="scene-counter">
              Escena: {currentScene.id}
            </span>
            <span className="clue-counter">
              Pistas: {discoveredClues.length}
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setShowClueBoard(!showClueBoard)}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {showClueBoard ? 'Ocultar pistas' : 'Ver pistas'}
          </button>
        </div>

        <SceneView scene={currentScene} />

        {isEndingScene && (
          <div className="ending-container">
            <div className="ending-text">{currentScene.text}</div>
            <button
              className="btn-primary"
              onClick={() => navigate(`/game/${sessionCode}`)}
              style={{ marginTop: '20px' }}
            >
              Volver a jugar
            </button>
          </div>
        )}

        {!isEndingScene && (
          <>
            {isInvestigationScene && (
              <div className="investigation-actions">
                <button className="btn-secondary" onClick={handleRevealClue}>
                  Revelar pista
                </button>
                <button className="btn-secondary" onClick={handleCreateCheckpoint}>
                  Guardar checkpoint
                </button>
              </div>
            )}

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

            {isInvestigationScene && !currentVote && (
              <VotingPanel scene={currentScene} />
            )}
          </>
        )}

        {showClueBoard && <ClueBoardPanel clues={discoveredClues} />}
      </div>
    </div>
  )
}
