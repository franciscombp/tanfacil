import { createClient } from '@supabase/supabase-js'

/**
 * Claves públicas del proyecto, incrustadas como respaldo.
 *
 * La anon key está pensada para viajar en el cliente: va en cada bundle
 * publicado (y ya está en el historial del repo), así que no es un secreto.
 * Tenerla aquí evita el fallo silencioso que hubo: si el build de CI no
 * recibe los secrets, antes salía un bundle "sin configurar" que nunca
 * conectaba. Las variables de entorno, si existen, tienen prioridad.
 */
const FALLBACK_URL = 'https://tlbovmiebqvukgvrcqyu.supabase.co'
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYm92bWllYnF2dWtndnJjcXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2Mjg4ODIsImV4cCI6MjEwMjIwNDg4Mn0.pjszjL2BFFavC5PyuV5fSYQPfoN0ubD5IYHWTkvCegk'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY

/** Sólo puede ser falso si se retiran los respaldos y faltan las variables. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: el juego funcionará sin sincronización en vivo.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export default supabase
