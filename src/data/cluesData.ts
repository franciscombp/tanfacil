export interface ClueData {
  id: string
  category: 'clock' | 'wall' | 'history' | 'present' | 'noise'
  text: string
  discoveredAt?: string
}

export const CLUES_DATABASE: ClueData[] = [
  // === RELOJ ===
  {
    id: 'clue_battery_dead',
    category: 'clock',
    text: 'La pila está agotada. Por eso el reloj está detenido.',
  },
  {
    id: 'clue_hands_stopped',
    category: 'clock',
    text: 'Las manecillas están detenidas en las 10:47.',
  },
  {
    id: 'clue_years_ago',
    category: 'clock',
    text: 'Este reloj lleva años en esta pared.',
  },
  {
    id: 'clue_timezone_wrong',
    category: 'clock',
    text: 'El reloj no muestra correctamente ninguna zona horaria. Parecía importante una vez.',
  },
  {
    id: 'clue_battery_works',
    category: 'clock',
    text: 'Si cambias la pila, el reloj vuelve a funcionar inmediatamente.',
  },

  // === PARED ===
  {
    id: 'clue_hole_behind',
    category: 'wall',
    text: 'Detrás del reloj hay un agujero circular en la pared.',
  },
  {
    id: 'clue_old_installation',
    category: 'wall',
    text: 'El agujero corresponde a una instalación antigua, probablemente de años.',
  },
  {
    id: 'clue_circular_mark',
    category: 'wall',
    text: 'El reloj está colocado exactamente sobre una marca circular.',
  },
  {
    id: 'clue_beam_structural',
    category: 'wall',
    text: 'La viga sostiene parte del falso techo. No se puede quitar sin riesgo.',
  },
  {
    id: 'clue_repaired_wall',
    category: 'wall',
    text: 'La pared fue reparada varias veces. Se ven parches antiguos.',
  },

  // === HISTORIA ===
  {
    id: 'clue_digital_clock',
    category: 'history',
    text: 'Antes había un reloj digital en ese lugar.',
  },
  {
    id: 'clue_ecuador_spain',
    category: 'history',
    text: 'El reloj digital mostraba la hora de Ecuador y España.',
  },
  {
    id: 'clue_no_calls',
    category: 'history',
    text: 'Se usaba para evitar llamadas fuera del horario laboral.',
  },
  {
    id: 'clue_digital_broken',
    category: 'history',
    text: 'El reloj digital dejó de funcionar hace años.',
  },
  {
    id: 'clue_analog_replacement',
    category: 'history',
    text: 'Este reloj analógico se colocó después como solución temporal.',
  },

  // === PRESENTE ===
  {
    id: 'clue_teams_status',
    category: 'present',
    text: 'Teams muestra la disponibilidad y zonas horarias de todos.',
  },
  {
    id: 'clue_teams_integration',
    category: 'present',
    text: 'Teams integra todo lo que el reloj digital hacía.',
  },
  {
    id: 'clue_nobody_maintains',
    category: 'present',
    text: 'Nadie tiene asignada la tarea de mantener el reloj.',
  },
  {
    id: 'clue_boss_forgets',
    category: 'present',
    text: 'El jefe ya no recuerda exactamente por qué el reloj está ahí.',
  },
  {
    id: 'clue_no_longer_needed',
    category: 'present',
    text: 'La necesidad original probablemente desapareció hace años.',
  },

  // === RUIDO ===
  {
    id: 'clue_always_there',
    category: 'noise',
    text: 'El reloj siempre estuvo ahí. Todos se acostumbraron.',
  },
  {
    id: 'clue_decoration',
    category: 'noise',
    text: 'La oficina se vería rara sin él. Alguien dice que combina con la decoración.',
  },
  {
    id: 'clue_old_owner',
    category: 'noise',
    text: 'Lo trajo una persona que ya no trabaja aquí.',
  },
  {
    id: 'clue_calendar_idea',
    category: 'noise',
    text: 'Alguien propone tapar el agujero con un calendario moderno.',
  },
  {
    id: 'clue_someone_likes',
    category: 'noise',
    text: 'A alguien le gusta el reloj. Dice que es "vintage".',
  },
]

export function getRandomClues(count: number): ClueData[] {
  const shuffled = [...CLUES_DATABASE].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getCluesByCategory(category: string): ClueData[] {
  return CLUES_DATABASE.filter((c) => c.category === category)
}

export function checkIfHasAllClues(
  discoveredClues: ClueData[],
  requiredIds: string[]
): boolean {
  const clueIds = new Set(discoveredClues.map((c) => c.id))
  return requiredIds.every((id) => clueIds.has(id))
}

// Conditions to unlock endings
export function canUnlockFinalRepair(clues: ClueData[]): boolean {
  return checkIfHasAllClues(clues, [
    'clue_battery_dead',
    'clue_hands_stopped',
    'clue_hole_behind',
    'clue_old_installation',
    'clue_digital_broken',
    'clue_teams_status',
    'clue_no_longer_needed',
  ])
}

export function canUnlockFinalConserve(clues: ClueData[]): boolean {
  return checkIfHasAllClues(clues, [
    'clue_battery_dead',
    'clue_hole_behind',
    'clue_circular_mark',
    'clue_digital_clock',
    'clue_ecuador_spain',
    'clue_digital_broken',
  ])
}

export function canUnlockFinalModern(clues: ClueData[]): boolean {
  return checkIfHasAllClues(clues, [
    'clue_no_calls',
    'clue_digital_broken',
    'clue_teams_status',
    'clue_teams_integration',
    'clue_nobody_maintains',
    'clue_no_longer_needed',
  ])
}
