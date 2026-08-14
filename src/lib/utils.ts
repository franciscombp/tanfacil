import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * tailwind-merge no conoce `text-titulo` ni `p-hueco`: clasifica cualquier
 * `text-<desconocido>` como COLOR y lo borra en cuanto detrás hay un color.
 * Sin esto, el recuento del revelado y la letra A–D se quedan sin tamaño.
 * No añade dependencias: `extendTailwindMerge` ya viene en tailwind-merge.
 */
const TAMANOS = ['rotulo', 'apoyo', 'cuerpo', 'accion', 'cifra', 'titulo']
const HUECOS = ['hueco-25', 'hueco-50', 'hueco-75', 'hueco', 'hueco-150', 'hueco-200']

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: { 'font-size': [{ text: TAMANOS }] },
    theme: { spacing: HUECOS },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parte un texto del guion en párrafos reales.
 *
 * Doble salto = párrafo nuevo. Salto simple = verso dentro del mismo párrafo:
 * los diálogos encadenados de `pregunta_consulta` y `decision_nostalgia`, las
 * dos únicas escenas de las 39 que los usan, se conservan con
 * `whitespace-pre-line` dentro de cada `<p>`.
 */
export function enParrafos(texto: string): string[] {
  return texto
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean)
}
