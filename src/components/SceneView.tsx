import { Scene } from '@/types/game'
import './components.css'

interface SceneViewProps {
  scene: Scene
}

export default function SceneView({ scene }: SceneViewProps) {
  return (
    <div className="scene-view">
      <div className="scene-image">
        <div className="image-placeholder">
          {scene.image}
        </div>
      </div>

      <div className="scene-text">
        <p>{scene.text}</p>
      </div>
    </div>
  )
}
