import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameView } from '@/components/game/GameView'
import { usePlayerName } from '@/game/usePlayerName'

export default function GamePage() {
  const navigate = useNavigate()
  const [name] = usePlayerName()

  useEffect(() => {
    if (!name) navigate('/', { replace: true })
  }, [name, navigate])

  if (!name) return null
  return <GameView role="player" name={name} onExit={() => navigate('/')} />
}
