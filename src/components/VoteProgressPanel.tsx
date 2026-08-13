import './components.css'

interface VoteProgressPanelProps {
  totalPlayers: number
  votedCount: number
}

export default function VoteProgressPanel({ totalPlayers, votedCount }: VoteProgressPanelProps) {
  const percentage = totalPlayers > 0 ? Math.round((votedCount / totalPlayers) * 100) : 0

  return (
    <div className="vote-progress-panel">
      <div className="progress-info">
        <div className="progress-text">
          {votedCount} de {totalPlayers} han votado
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="progress-percentage">{percentage}%</div>
      </div>
    </div>
  )
}
