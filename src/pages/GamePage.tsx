import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import { registerPlayer, getSessionPlayers, openVote, submitVote, closeVote, updateSceneId } from '@/lib/gameService'
import { STORY_SCENES } from '@/data/storyData'
import { Scene } from '@/types/game'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LogOut, Users, CheckCircle2, Clock } from 'lucide-react'

const GAME_SESSION_ID = 'poc-session-001'

export default function GamePage() {
  const navigate = useNavigate()
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)
  const playerId = useGameStore((s) => s.playerId)
  const setPlayerId = useGameStore((s) => s.setPlayerId)

  const [currentSceneId, setCurrentSceneId] = useState<string>('scene_001')
  const currentScene: Scene | null = STORY_SCENES[currentSceneId] || null
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentVote, setCurrentVote] = useState<any>(null)
  const [playerHasVoted, setPlayerHasVoted] = useState(false)
  const [votedOption, setVotedOption] = useState<string | null>(null)

  useEffect(() => {
    if (!playerDisplayName) {
      navigate('/')
      return
    }
    initializePlayer()
  }, [playerDisplayName])

  useEffect(() => {
    if (!playerId) return
    subscribeToGameUpdates()
  }, [playerId])

  const initializePlayer = async () => {
    try {
      const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setPlayerId(newPlayerId)
      await registerPlayer(GAME_SESSION_ID, newPlayerId, playerDisplayName)
      fetchPlayers()
      setLoading(false)
    } catch (error) {
      console.error('Error inicializando jugador:', error)
      navigate('/')
    }
  }

  const fetchPlayers = async () => {
    try {
      const playersList = await getSessionPlayers(GAME_SESSION_ID)
      setPlayers(playersList)
    } catch (error) {
      console.error('Error cargando jugadores:', error)
    }
  }

  const subscribeToGameUpdates = () => {
    const playersChannel = supabase
      .channel(`players:${GAME_SESSION_ID}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${GAME_SESSION_ID}`,
      }, () => fetchPlayers())
      .subscribe()

    const votesChannel = supabase
      .channel(`votes:${GAME_SESSION_ID}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `session_id=eq.${GAME_SESSION_ID}`,
      }, () => fetchVoteStatus())
      .subscribe()

    return () => {
      playersChannel.unsubscribe()
      votesChannel.unsubscribe()
    }
  }

  const fetchVoteStatus = async () => {
    try {
      // Aquí iría la lógica para obtener el estado de votación actual
    } catch (error) {
      console.error('Error cargando votación:', error)
    }
  }

  const handleVote = async (optionId: string) => {
    if (!playerId || !currentScene) return

    try {
      if (!currentVote) {
        const vote = await openVote(GAME_SESSION_ID, currentScene.id, currentScene.options)
        setCurrentVote(vote)
      }

      if (currentVote) {
        await submitVote(currentVote.id, playerId, optionId)
        setVotedOption(optionId)
        setPlayerHasVoted(true)
      }
    } catch (error) {
      console.error('Error votando:', error)
    }
  }

  const handleContinueToNextScene = async (nextSceneId: string) => {
    if (!currentVote) return

    try {
      await closeVote(currentVote.id, votedOption || '')
      await updateSceneId(GAME_SESSION_ID, nextSceneId)
      setCurrentSceneId(nextSceneId)
      setCurrentVote(null)
      setPlayerHasVoted(false)
      setVotedOption(null)
    } catch (error) {
      console.error('Error avanzando a siguiente escena:', error)
    }
  }

  const getNextSceneId = (): string | null => {
    if (!votedOption || !currentScene) return null
    const selectedOption = currentScene.options.find(opt => opt.id === votedOption)
    return selectedOption?.nextScene || null
  }

  const playersWhoVoted = players.filter(p => {
    // Simular que el jugador actual votó si playerHasVoted es true
    return playerHasVoted && p.player_id === playerId
  }).length

  const votedPercentage = players.length > 0 ? (playersWhoVoted / players.length) * 100 : 0

  if (loading || !currentScene) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <p className="text-white mt-4 text-lg font-medium">Cargando juego...</p>
        </div>
      </div>
    )
  }

  const isEndingScene = currentScene.type === 'ending'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <h1 className="text-3xl font-bold">No es tan fácil</h1>
            <p className="text-blue-100 text-sm mt-1">Escena {currentScene.id}</p>
          </div>
          <Button
            variant="outline"
            className="bg-white/20 border-white text-white hover:bg-white/30"
            onClick={() => navigate('/')}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* MAIN SCENE - 3 columns */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white pb-4">
                <CardTitle className="text-2xl">{currentScene.image}</CardTitle>
              </CardHeader>

              <CardContent className="p-8">
                {isEndingScene ? (
                  <div className="space-y-6">
                    <div className="prose max-w-none">
                      <p className="text-lg text-gray-700 leading-relaxed">{currentScene.text}</p>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      size="lg"
                      onClick={() => navigate('/')}
                    >
                      Volver al inicio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Scene Description */}
                    <div>
                      <p className="text-lg text-gray-700 mb-6 leading-relaxed">{currentScene.text}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Progreso de votación</span>
                        <span className="text-gray-500">{Math.round(votedPercentage)}%</span>
                      </div>
                      <Progress value={votedPercentage} className="h-3" />
                    </div>

                    {/* Voting Options */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-700">¿Qué hacemos?</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentScene.options.map((option) => (
                          <Button
                            key={option.id}
                            variant={votedOption === option.id ? "default" : "outline"}
                            className={`h-auto py-4 px-4 text-left justify-start transition-all ${
                              votedOption === option.id
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0'
                                : 'hover:border-blue-500'
                            } ${playerHasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => handleVote(option.id)}
                            disabled={playerHasVoted}
                          >
                            <span className="font-medium">{option.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Continue Button */}
                    {playerHasVoted && getNextSceneId() && (
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                        size="lg"
                        onClick={() => handleContinueToNextScene(getNextSceneId()!)}
                      >
                        Continuar a la siguiente escena
                      </Button>
                    )}

                    {/* Vote Status */}
                    {playerHasVoted && (
                      <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>¡Tu voto ha sido registrado!</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PLAYERS PANEL - 1 column */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-2xl h-full">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Jugadores ({players.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {players.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">Esperando jugadores...</p>
                  ) : (
                    players.map((player) => {
                      const hasVoted = playerHasVoted && player.player_id === playerId
                      const isCurrentPlayer = player.player_id === playerId

                      return (
                        <div
                          key={player.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isCurrentPlayer
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate text-gray-800">
                                {player.display_name}
                                {isCurrentPlayer && (
                                  <span className="ml-1 text-xs text-blue-600 font-semibold">(Tú)</span>
                                )}
                              </p>
                            </div>
                            <Badge
                              variant={hasVoted ? 'default' : 'secondary'}
                              className="flex-shrink-0 whitespace-nowrap"
                            >
                              {hasVoted ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Votó
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Esperando
                                </div>
                              )}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
