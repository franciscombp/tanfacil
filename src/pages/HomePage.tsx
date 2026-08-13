import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlayerName } from '@/game/usePlayerName'
import { story } from '@/game/story'
import { APP_VERSION } from '@/lib/useAppVersion'
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
  const [savedName, setPlayerName] = usePlayerName()
  const [name, setName] = useState(savedName)
  const [error, setError] = useState('')

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Ingresa tu nombre')
      return
    }
    setPlayerName(name.trim())
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
          <CardTitle className="text-2xl">{story.title}</CardTitle>
          <CardDescription>{story.premise}</CardDescription>
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
            Debatan cada decisión y voten: la historia avanza con el grupo.
          </p>
          <p
            className="mt-3 text-center font-mono text-[10px] text-muted-foreground/70"
            title="Versión de la compilación en uso"
          >
            v{APP_VERSION}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
