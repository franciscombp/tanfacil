import { Scene } from '@/types/game'

export const STORY_SCENES: Record<string, Scene> = {
  // === NODO 001: Encargo ===
  scene_001: {
    id: 'scene_001',
    type: 'vote',
    image: '🕐 Reloj tapado por viga',
    text: 'El jefe pidió arreglar el reloj antes de las 12:00.',
    options: [
      { id: 'solve_now', label: 'Solucionarlo', nextScene: 'scene_002' },
      { id: 'think', label: 'Déjame pensarlo', nextScene: 'scene_003' },
    ],
  },

  // === NODO 002: Solución absurda ===
  scene_002: {
    id: 'scene_002',
    type: 'vote',
    image: '🎨 Reloj medio pintado',
    text: 'Alguien pintó la mitad del reloj que no se ve.',
    options: [
      { id: 'remove_beam', label: 'Quitar la viga', nextScene: 'scene_004' },
      { id: 'move_clock', label: 'Mover el reloj', nextScene: 'scene_005' },
      { id: 'erase_paint', label: 'Borrar la pintura', nextScene: 'scene_006' },
      { id: 'investigate', label: 'Investigar primero', nextScene: 'scene_003' },
    ],
  },

  // === NODO 003: Investigación ===
  scene_003: {
    id: 'scene_003',
    type: 'investigation',
    image: '🔍 Reloj sin tocar',
    text: 'Todavía no has tocado nada. ¿Qué quieres investigar?',
    options: [
      { id: 'look_clock', label: 'Mirar el reloj de cerca', nextScene: 'scene_003_clue' },
      { id: 'check_wall', label: 'Revisar la pared', nextScene: 'scene_003_clue' },
      { id: 'ask_history', label: 'Preguntar qué había antes', nextScene: 'scene_003_clue' },
      { id: 'act', label: 'Actuar de todas formas', nextScene: 'scene_002' },
    ],
  },

  scene_003_clue: {
    id: 'scene_003_clue',
    type: 'reveal',
    image: '💡 Pista descubierta',
    text: 'Has descubierto una pista. Vuelve a investigar o actúa.',
    options: [
      { id: 'investigate_more', label: 'Investigar otra cosa', nextScene: 'scene_003' },
      { id: 'act_now', label: 'Actuar con lo que sé', nextScene: 'scene_002' },
    ],
  },

  // === NODO 004: Quitar la viga ===
  scene_004: {
    id: 'scene_004',
    type: 'reveal',
    image: '⚠️ Techo inestable',
    text: 'La viga sostiene parte del falso techo. Al quitarla, el techo se derrumba.',
    options: [
      { id: 'return_004', label: 'Volver al checkpoint', nextScene: 'checkpoint_return_002' },
      { id: 'continue_004', label: 'Seguir adelante', nextScene: 'scene_007' },
    ],
  },

  // === NODO 005: Mover el reloj ===
  scene_005: {
    id: 'scene_005',
    type: 'reveal',
    image: '🕳️ Agujero revelado',
    text: 'Al mover el reloj, aparece un agujero en la pared.',
    options: [
      { id: 'repair', label: 'Reparar el agujero', nextScene: 'scene_007' },
      { id: 'return_005', label: 'Volver al checkpoint', nextScene: 'checkpoint_return_002' },
    ],
  },

  // === NODO 006: Borrar la pintura ===
  scene_006: {
    id: 'scene_006',
    type: 'reveal',
    image: '🖌️ Parches de pared',
    text: 'Debajo de la pintura hay capas de parches antiguos.',
    options: [
      { id: 'continue_006', label: 'Seguir investigando', nextScene: 'scene_003' },
      { id: 'return_006', label: 'Volver', nextScene: 'checkpoint_return_002' },
    ],
  },

  // === NODO 007: Comprender la situación ===
  scene_007: {
    id: 'scene_007',
    type: 'vote',
    image: '🤔 Pieza del puzle',
    text: 'Empiezas a entender: el reloj está detenido y tapa un agujero.',
    options: [
      { id: 'change_battery', label: 'Cambiar la pila', nextScene: 'scene_boss_arrives' },
      { id: 'investigate_more_007', label: 'Investigar más sobre el reloj', nextScene: 'scene_003' },
      { id: 'learn_about_hole', label: 'Aprender sobre el agujero', nextScene: 'scene_003' },
      { id: 'learn_history', label: 'Aprender la historia del reloj', nextScene: 'scene_003' },
    ],
  },

  // === BOSS ARRIVES ===
  scene_boss_arrives: {
    id: 'scene_boss_arrives',
    type: 'reveal',
    image: '😰 Jefe furioso',
    text: 'El reloj funciona ahora, pero el jefe llega y ve el desastre.',
    options: [
      { id: 'return_boss', label: 'Volver al checkpoint', nextScene: 'checkpoint_return_002' },
      { id: 'continue_boss', label: 'Enfrentar las consecuencias', nextScene: 'scene_008' },
    ],
  },

  scene_008: {
    id: 'scene_008',
    type: 'reveal',
    image: '💼 Jefe decepcionado',
    text: 'El jefe ve el techo dañado, el agujero, la pintura... No fue la solución.',
    options: [
      { id: 'restart', label: 'Volver al inicio', nextScene: 'scene_001' },
    ],
  },

  // === FINALES BUENOS ===

  // Final 1: Reparar todo sin reloj
  scene_final_repair: {
    id: 'scene_final_repair',
    type: 'ending',
    image: '✨ Pared reparada',
    text: '✓ Reparaste la pared, removiste el reloj innecesario y todo está perfecto.',
    options: [
      { id: 'play_again', label: 'Volver a jugar', nextScene: 'scene_001' },
    ],
  },

  // Final 2: Conservar el reloj
  scene_final_conserve: {
    id: 'scene_final_conserve',
    type: 'ending',
    image: '📦 Reloj guardado',
    text: '✓ Guardaste el reloj como recuerdo. La pared está reparada y funcional.',
    options: [
      { id: 'play_again_2', label: 'Volver a jugar', nextScene: 'scene_001' },
    ],
  },

  // Final 3: Solución moderna (Teams)
  scene_final_modern: {
    id: 'scene_final_modern',
    type: 'ending',
    image: '💻 Teams en la pantalla',
    text: '✓ Teams ya cubre todas las funciones. No necesitas un reloj antiguo.',
    options: [
      { id: 'play_again_3', label: 'Volver a jugar', nextScene: 'scene_001' },
    ],
  },

  // Checkpoint returns
  checkpoint_return_002: {
    id: 'checkpoint_return_002',
    type: 'reveal',
    image: '⏮️ Volviendo...',
    text: 'Volviste al checkpoint. Intenta algo diferente.',
    options: [
      { id: 'continue_from_checkpoint', label: 'Continuar', nextScene: 'scene_002' },
    ],
  },
}
