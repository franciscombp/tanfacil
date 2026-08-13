import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STORY_SCENES } from '@/data/storyData'
import { Scene } from '@/types/game'
import SceneView from '@/components/SceneView'
import './pages.css'

export default function GamePage() {
  const navigate = useNavigate()

  const [currentSceneId, setCurrentSceneId] = useState<string>('scene_001')
  const currentScene: Scene | null = STORY_SCENES[currentSceneId] || null

  const handleVoteOption = (nextSceneId: string) => {
    setCurrentSceneId(nextSceneId)
  }

  const handleHome = () => {
    navigate('/')
  }

  if (!currentScene) {
    return (
      <div className="page page-game">
        <div className="container flex-center" style={{ height: '100vh' }}>
          <div>
            <p>Escena no encontrada</p>
            <button onClick={handleHome}>Volver al inicio</button>
          </div>
        </div>
      </div>
    )
  }

  const isEndingScene = currentScene.type === 'ending'

  return (
    <div className="page page-game">
      <div className="container">
        <div className="game-top-bar">
          <div className="game-status">
            <span className="scene-counter">
              Escena: {currentScene.id}
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={handleHome}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            Inicio
          </button>
        </div>

        <SceneView scene={currentScene} />

        {isEndingScene ? (
          <div className="ending-container">
            <div className="ending-text">{currentScene.text}</div>
            <button
              className="btn-primary"
              onClick={handleHome}
              style={{ marginTop: '20px' }}
            >
              Volver al inicio
            </button>
          </div>
        ) : (
          <div className="voting-options" style={{ marginTop: '40px' }}>
            {currentScene.options.map((option) => (
              <button
                key={option.id}
                className="voting-option"
                onClick={() => handleVoteOption(option.nextScene || currentScene.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
