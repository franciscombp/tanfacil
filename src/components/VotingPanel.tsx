import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { Scene } from '@/types/game'
import './components.css'

interface VotingPanelProps {
  scene: Scene
}

export default function VotingPanel({ scene }: VotingPanelProps) {
  const playerId = useGameStore((s) => s.playerId)
  const currentVote = useGameStore((s) => s.currentVote)
  const setPlayerVoted = useGameStore((s) => s.setPlayerVoted)
  const selectedOption = useGameStore((s) => s.selectedOption)
  const setSelectedOption = useGameStore((s) => s.setSelectedOption)

  const [submitting, setSubmitting] = useState(false)

  const handleVote = async (optionId: string) => {
    if (!currentVote || !playerId || submitting) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('player_votes').insert({
        vote_id: currentVote.id,
        player_id: playerId,
        option_id: optionId,
      })

      if (error) throw error

      setPlayerVoted(true)
      setSelectedOption(optionId)
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  if (!currentVote) return null

  return (
    <div className="voting-panel">
      <div className="voting-title">Elige una opción</div>

      <div className="voting-options">
        {scene.options.map((option) => (
          <button
            key={option.id}
            className={`voting-option ${selectedOption === option.id ? 'selected' : ''}`}
            onClick={() => handleVote(option.id)}
            disabled={submitting}
          >
            {option.label}
          </button>
        ))}
      </div>

      {submitting && <div className="voting-loading">Registrando tu voto...</div>}
    </div>
  )
}
