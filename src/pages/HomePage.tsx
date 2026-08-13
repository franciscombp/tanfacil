import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Users } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-full">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold">No es tan fácil</CardTitle>
            <CardDescription className="text-lg">
              Una experiencia de votación cooperativa
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleStartGame} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
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
                  placeholder="Ingresa tu nombre..."
                  autoFocus
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Empezar el juego
              </Button>
            </form>

            <div className="pt-6 border-t border-gray-200">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p>Juega con otros jugadores en tiempo real</p>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <p>Toma decisiones colectivas en una historia interactiva</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
