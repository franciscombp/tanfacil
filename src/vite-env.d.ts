/// <reference types="vite/client" />

/** Versión de la compilación, inyectada por vite.config.ts. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
