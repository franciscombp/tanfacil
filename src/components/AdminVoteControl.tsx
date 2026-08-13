import { useState } from 'react'
import { closeVote } from '@/lib/gameService'
import { useVoteMonitor } from '@/hooks/useVoteMonitor'
import VoteResultsPanel from './VoteResultsPanel'
import './components.css'

interface AdminVoteControlProps {
  voteId: string | null
  onVoteClosed: (winnerOptionId: string) => void
}

export default function AdminVoteControl({
  voteId,
  onVoteClosed,
}: AdminVoteControlProps) {
  const stats = useVoteMonitor(voteId)
  const [closing, setClosing] = useState(false)
  const [showResults, setShowResults] = useState(false)

  if (!voteId || !stats) {
    return (
      <div className="admin-vote-control">
        <p className="text-secondary">No hay votación abierta</p>
      </div>
    )
  }

  const handleCloseVote = async () => {
    if (!stats.majorityOptionId) return

    setClosing(true)
    try {
      const success = await closeVote(voteId, stats.majorityOptionId)
      if (success) {
        setShowResults(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setClosing(false)
    }
  }

  const handleContinue = (optionId: string) => {
    onVoteClosed(optionId)
  }

  return (
    <div className="admin-vote-control">
      <div className="vote-status">
        <h3>Votación en progreso</h3>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">Jugadores</div>
            <div className="status-value">
              {stats.votedCount} / {stats.totalPlayers}
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">Máximos votos</div>
            <div className="status-value">{stats.maxVotes}</div>
          </div>

          <div className="status-item">
            <div className="status-label">Estado</div>
            <div className={`status-badge ${stats.hasAbsoluteMajority ? 'majority' : ''}`}>
              {stats.hasAbsoluteMajority ? '✓ Mayoría' : 'Votando'}
            </div>
          </div>
        </div>
      </div>

      <div className="vote-options-admin">
        <h4>Votos por opción:</h4>
        <div className="options-list">
          {stats.options.map((opt) => (
            <div key={opt.id} className="option-row">
              <span className="option-label">{opt.label}</span>
              <span className="option-count">{opt.votes} votos</span>
            </div>
          ))}
        </div>
      </div>

      {!showResults && (
        <div className="admin-actions">
          <button
            className="btn-primary"
            onClick={handleCloseVote}
            disabled={
              closing || (!stats.allVoted && !stats.hasAbsoluteMajority) || !stats.majorityOptionId
            }
          >
            {closing ? 'Cerrando...' : 'Cerrar votación'}
          </button>

          {!stats.hasAbsoluteMajority && !stats.allVoted && (
            <p className="text-secondary text-small">
              {stats.majorityOptionId
                ? 'Mayoría absoluta alcanzada'
                : `Esperando mayoría absoluta o que todos voten...`}
            </p>
          )}
        </div>
      )}

      {showResults && (
        <VoteResultsPanel
          vote={null}
          options={stats.options}
          winnerOptionId={stats.majorityOptionId}
          onContinue={handleContinue}
          loading={false}
        />
      )}
    </div>
  )
}
