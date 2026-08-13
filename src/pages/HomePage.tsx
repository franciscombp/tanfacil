import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function HomePage() {
  const navigate = useNavigate()
  const setPlayerDisplayName = useGameStore((s) => s.setPlayerDisplayName)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Ingresa tu nombre')
      return
    }
    setPlayerDisplayName(name.trim())
    navigate('/game')
  }

  return (
    <div className="fixed inset-0 grid place-items-center overflow-y-auto bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted))_0%,hsl(var(--background))_70%)]"
      />
      <Card className="relative w-full max-w-sm animate-fade-up">
        <CardHeader className="text-center">
          <div className="mb-2 text-5xl leading-none">🕐</div>
          <CardTitle className="text-2xl">No es tan fácil</CardTitle>
          <CardDescription>
            Una historia interactiva que se decide entre todos
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleStartGame} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none">
                ¿Cuál es tu nombre?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Tu nombre"
                autoFocus
                maxLength={20}
                aria-invalid={Boolean(error)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full">
              Entrar a la sala
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Todos los jugadores comparten la misma sala: la escena avanza cuando
            todos han votado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
