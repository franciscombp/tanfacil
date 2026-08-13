# Contenido del juego

Todo lo editable (diálogos, cartas, checkpoints, finales, tiempos e
ilustraciones) vive aquí. El código no conoce la historia: sólo la carga.

## Estructura

```
content/
  index.ts               ← registro de historias (cambiar ACTIVE_STORY_ID)
  stories/
    reloj/
      story.json         ← escenas, mazo, checkpoints, tiempos, textos finales
      scenes/
        <sceneId>.svg    ← una ilustración por escena (opcional)
```

## Añadir o cambiar una historia

1. Duplica `stories/reloj/` con otro id, por ejemplo `stories/impresora/`.
2. Edita su `story.json`. La validación avisa por consola de enlaces rotos.
3. Regístrala en `index.ts` y apunta `ACTIVE_STORY_ID` a su id.

## Reglas del formato

- Una escena sin `options` o con `"type": "ending"` es un final.
- `next` debe apuntar al id de otra escena.
- `draw` saca una carta de ese apartado del tablero (`board`).
- `detour: true` marca una consecuencia: vuelve al último checkpoint con
  `returnToCheckpoint: true` y explica el aprendizaje en `feedback`.
- Si falta `scenes/<sceneId>.svg`, la escena usa su emoji `art`.
- `timers` controla la espera: segundos de votación, de revelado del resultado
  y el margen para rectificar cuando ya votaron todos.
