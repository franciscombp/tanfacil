import { Scene } from '@/types/game'

export const STORY_SCENES: Record<string, Scene> = {
  // === ESCENA 001: El problema ===
  scene_001: {
    id: 'scene_001',
    type: 'vote',
    image: '🕐 Reloj roto',
    text: 'Alguien pegó el reloj roto con cinta adhesiva. El jefe lo vio y está furioso. ¿Qué hacemos?',
    options: [
      { id: 'investigate', label: 'Investigar primero', nextScene: 'scene_002' },
      { id: 'quick_fix', label: 'Repararlo rápido', nextScene: 'scene_003' },
      { id: 'replace', label: 'Reemplazarlo', nextScene: 'scene_005' },
    ],
  },

  // === ESCENA 002: Investigación ===
  scene_002: {
    id: 'scene_002',
    type: 'investigation',
    image: '🔍 Examinando la pared',
    text: 'Investigan el reloj y la pared. Descubren cosas importantes.',
    options: [
      { id: 'clue1', label: 'Examinar el reloj', nextScene: 'scene_002_clue' },
      { id: 'clue2', label: 'Revisar la pared', nextScene: 'scene_002_clue' },
      { id: 'clue3', label: 'Preguntar al que lo pegó', nextScene: 'scene_002_clue' },
      { id: 'decide', label: 'Ya tengo suficiente', nextScene: 'scene_decision' },
    ],
  },

  scene_002_clue: {
    id: 'scene_002_clue',
    type: 'investigation',
    image: '💡 Nueva información',
    text: 'Descubren una pista sobre qué pasó con el reloj.',
    options: [
      { id: 'investigate_more', label: 'Investigar más', nextScene: 'scene_002' },
      { id: 'decide', label: 'Tomar una decisión', nextScene: 'scene_decision' },
    ],
  },

  // === ESCENA 003: Reparación rápida ===
  scene_003: {
    id: 'scene_003',
    type: 'vote',
    image: '🔧 Herramientas listas',
    text: 'Intentas repararlo rápidamente, pero descubres que es más complejo de lo que parece.',
    options: [
      { id: 'investigate', label: 'Investigar primero', nextScene: 'scene_002' },
      { id: 'full_repair', label: 'Reparación completa', nextScene: 'scene_004' },
      { id: 'replace', label: 'Mejor reemplazarlo', nextScene: 'scene_005' },
    ],
  },

  // === ESCENA 004: Reparación completa ===
  scene_004: {
    id: 'scene_004',
    type: 'vote',
    image: '⚙️ Piezas dentro',
    text: 'Al abrir el reloj, ves que necesita mantenimiento. Las piezas están oxidadas y los cables rotos.',
    options: [
      { id: 'restore', label: 'Restaurarlo completamente', nextScene: 'scene_repair_path' },
      { id: 'conserve', label: 'Mantenerlo como está, dejarlo en la pared como recuerdo', nextScene: 'scene_conserve_path' },
      { id: 'replace', label: 'Reemplazarlo', nextScene: 'scene_modern_path' },
    ],
  },

  // === ESCENA 005: Reemplazo ===
  scene_005: {
    id: 'scene_005',
    type: 'vote',
    image: '📱 Digital alternatives',
    text: '¿Con qué lo reemplazamos? El viejo reloj fue una buena opción en su momento, pero ahora hay alternativas.',
    options: [
      { id: 'new_clock', label: 'Comprar un nuevo reloj moderno', nextScene: 'scene_modern_path' },
      { id: 'digital', label: 'Usar una pantalla digital', nextScene: 'scene_modern_path' },
      { id: 'keep', label: 'Mantener este, es icónico', nextScene: 'scene_decision' },
    ],
  },

  // === ESCENA DECISIÓN: Punto de inflexión ===
  scene_decision: {
    id: 'scene_decision',
    type: 'vote',
    image: '🤔 Decisión final',
    text: 'Han llegado al punto de decisión. ¿Qué hacen con el reloj pegado con cinta?',
    options: [
      { id: 'repair', label: 'Repararlo correctamente', nextScene: 'scene_repair_path' },
      { id: 'conserve', label: 'Conservarlo como está', nextScene: 'scene_conserve_path' },
      { id: 'modern', label: 'Solución moderna', nextScene: 'scene_modern_path' },
    ],
  },

  // === FINAL 1: REPARACIÓN ===
  scene_repair_path: {
    id: 'scene_repair_path',
    type: 'ending',
    image: '✅ Reloj funcionando',
    text: 'Después de horas de trabajo, lograron restaurar el reloj. Ahora funciona perfectamente, como si fuera nuevo. El jefe está satisfecho. La cinta adhesiva se quedará en la historia, pero el reloj vuelve a marcar el tiempo correctamente.',
    options: [],
  },

  // === FINAL 2: CONSERVACIÓN ===
  scene_conserve_path: {
    id: 'scene_conserve_path',
    type: 'ending',
    image: '🎨 Reloj pegado con cinta',
    text: 'Decidieron dejar el reloj pegado con cinta. Lo marcaron como "En uso" con una placa que dice "Hotfix en producción". Se convirtió en un símbolo de la oficina: un recordatorio de que a veces los problemas temporales se quedan más tiempo del previsto, y eso está bien.',
    options: [],
  },

  // === FINAL 3: MODERNIZACIÓN ===
  scene_modern_path: {
    id: 'scene_modern_path',
    type: 'ending',
    image: '📊 Teams Calendar',
    text: 'En lugar de gastar recursos arreglando un reloj antiguo, sugieren cambiar completamente. Instalan un sistema digital que muestra la hora en todas las pantallas de la oficina, integrado con Teams. El viejo reloj pegado con cinta se retira y se guarda como pieza de museo. Es un nuevo comienzo.',
    options: [],
  },
}
