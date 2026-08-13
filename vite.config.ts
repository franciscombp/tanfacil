import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

/** Versión de la compilación: fecha + commit. Cambia con cada build. */
function buildVersion(): string {
  let sha = 'local'
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    // Fuera de un repo git (por ejemplo en un tarball): basta con la fecha.
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `${stamp} · ${sha}`
}

/**
 * Publica la versión en `version.json` para que la app pueda detectar que hay
 * una compilación nueva y recargarse sola, y vuelve a crear `.nojekyll`, que
 * Vite borra al vaciar la carpeta de salida.
 */
function deployMetaPlugin(version: string): Plugin {
  return {
    name: 'deploy-meta',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'docs')
      writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ version }, null, 2) + '\n'
      )
      writeFileSync(path.join(outDir, '.nojekyll'), '')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const version = buildVersion()

  return {
    base: '/tanfacil/',
    plugins: [react(), deployMetaPlugin(version)],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'docs',
    },
    server: {
      port: 5173,
      open: true,
    },
  }
})
