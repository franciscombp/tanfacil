import { Vote } from '@/types/game'
import './components.css'

interface VoteResultsPanelProps {
  vote: Vote | null
  options: Array<{
    id: string
    label: string
    votes: number
    percentage: number
  }>
  winnerOptionId: string | null
  onContinue: (optionId: string) => void
  loading?: boolean
}

export default function VoteResultsPanel({
  vote,
  options,
  winnerOptionId,
  onContinue,
  loading = false,
}: VoteResultsPanelProps) {
  if (!vote) return null

  return (
    <div className="vote-results-panel">
      <div className="results-header">
        <h3>Resultados de la votación</h3>
      </div>

      <div className="results-options">
        {options.map((opt) => (
          <div
            key={opt.id}
            className={`results-option ${opt.id === winnerOptionId ? 'winner' : ''}`}
          >
            <div className="result-label">{opt.label}</div>
            <div className="result-bar">
              <div className="result-fill" style={{ width: `${opt.percentage}%` }} />
            </div>
            <div className="result-stats">
              <span className="result-votes">{opt.votes} votos</span>
              <span className="result-percentage">{opt.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {winnerOptionId && (
        <div className="results-footer">
          <button
            className="btn-primary"
            onClick={() => onContinue(winnerOptionId)}
            disabled={loading}
          >
            {loading ? 'Continuando...' : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  )
}
