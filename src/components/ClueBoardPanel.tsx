import { Clue } from '@/types/game'
import './components.css'

interface ClueBoardPanelProps {
  clues: Clue[]
}

export default function ClueBoardPanel({ clues }: ClueBoardPanelProps) {
  const groupedClues = clues.reduce(
    (acc, clue) => {
      if (!acc[clue.category]) acc[clue.category] = []
      acc[clue.category].push(clue)
      return acc
    },
    {} as Record<string, Clue[]>
  )

  const categoryLabels: Record<string, string> = {
    clock: '🕐 Reloj',
    wall: '🧱 Pared',
    history: '📖 Historia',
    present: '💼 Presente',
    noise: '📢 Ruido',
  }

  return (
    <div className="clue-board-panel">
      <div className="clue-board-header">
        <h3>Pistas descubiertas ({clues.length})</h3>
      </div>

      {clues.length === 0 ? (
        <div className="clue-board-empty">
          <p>Aún no has descubierto pistas. Investiga para aprender más.</p>
        </div>
      ) : (
        <div className="clues-by-category">
          {Object.entries(groupedClues).map(([category, categoryClues]) => (
            <div key={category} className="clue-category">
              <div className="category-title">{categoryLabels[category]}</div>
              <div className="clues-list">
                {categoryClues.map((clue) => (
                  <div key={clue.id} className="clue-item">
                    <div className="clue-text">{clue.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
