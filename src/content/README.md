# Contenido del juego

Todo lo editable (escenas, opciones, memoria, finales, tiempos e
ilustraciones) vive aquí. El código no conoce la historia: sólo la carga.

## Estructura

```
content/
  index.ts               ← registro de historias (cambiar ACTIVE_STORY_ID)
  stories/
    reloj/
      story.json         ← escenas, memoria, cierre, tiempos
      scenes/
        <sceneId>.svg    ← una ilustración por escena (opcional)
```

## Añadir o cambiar una historia

1. Duplica `stories/reloj/` con otro id.
2. Edita su `story.json`. Los tests (`npx vitest run`) validan el grafo:
   enlaces rotos, escenas inalcanzables, más de cuatro opciones…
3. Regístrala en `index.ts` y apunta `ACTIVE_STORY_ID` a su id.

## Reglas del formato

- Tipos de escena: `scene`, `detour` (consecuencia que devuelve a la
  conversación), `convergence` y `ending` (sin opciones).
- Cada opción: `id`, `label`, `next` (id de otra escena) y `actionType`
  (`actuar | preguntar | observar | broma | decidir`), usado para las
  métricas de primera acción impulsiva y primera pregunta.
- `memoryAdd`: hechos que se descubren al llegar a la escena. Son
  acumulativos, nunca se borran y se muestran en el panel «Lo que sabemos».
  Máximo cuatro opciones por escena.
- La opción que llevó a un desvío queda marcada «Ya intentamos esto» al
  volver. Si todas las opciones de una escena quedaran bloqueadas, ninguna
  se bloquea.
- `closing`: pantalla de cierre tras cualquier final (descubrimientos,
  frase final y etiqueta del tiempo total).
- `noon`: texto que aparece una vez cuando el reloj narrativo pasa de las
  12:00. Nada termina ni se bloquea por tiempo.
- Si falta `scenes/<sceneId>.svg`, la escena usa su emoji `art`.
