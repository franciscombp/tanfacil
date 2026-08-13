# No es tan fácil

Una experiencia narrativa cooperativa de votación en vivo para aproximadamente 50 jugadores simultáneos.

## Características

- 🎮 Votaciones en tiempo real con Supabase Realtime
- 👥 Soporte para hasta 50 jugadores simultáneos
- 🎯 Votación automática cuando todos votaron o por mayoría absoluta
- 📱 Interfaz responsive (funciona en móvil y desktop)
- 🔐 Panel administrativo protegido con token
- ⚡ Sin servidor: frontend estático + Supabase serverless

## Stack técnico

- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **State:** Zustand
- **Routing:** React Router
- **Styling:** CSS nativo

## Instalación

### Requisitos previos

- Node.js 18+
- npm o yarn
- Una cuenta en Supabase (gratis)

### Paso 1: Clonar y instalar dependencias

```bash
git clone <repo>
cd tanfacil
npm install
```

### Paso 2: Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia tu `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde Settings → API
3. Crea un archivo `.env.local`:

```bash
cp .env.example .env.local
```

4. Rellena los valores:

```
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[TU_ANON_KEY]
VITE_ADMIN_TOKEN=ADMIN-SECRET-12345
```

### Paso 3: Ejecutar migraciones

Ve a **SQL Editor** en Supabase y ejecuta el SQL de `supabase/migrations/001_initial_schema.sql` (será proporcionado).

### Paso 4: Desarrollo local

```bash
npm run dev
```

La app se abrirá en `http://localhost:5173`

### Paso 5: Build para producción

```bash
npm run build
npm run preview
```

## Uso

### Para jugadores

1. Ve a la página principal
2. Haz clic en "Unirse a un juego"
3. Ingresa el código de sesión (ej: RELOJ-482) y tu nombre
4. Espera en el lobby hasta que el administrador inicie la partida
5. Votarás en cada escena para tomar decisiones colectivas

### Para administrador

1. Ve a `/admin`
2. Ingresa el token de acceso (por defecto: `ADMIN-SECRET-12345`)
3. Crea una nueva sesión
4. Comparte el código con los jugadores
5. Cuando estén todos conectados, inicia la partida

## Estructura del proyecto

```
src/
├── components/         # Componentes reutilizables
├── lib/               # Funciones de utilidad (Supabase client)
├── pages/             # Páginas principales
├── store/             # Zustand store
├── types/             # Tipos TypeScript
├── App.tsx            # Componente raíz
├── main.tsx           # Punto de entrada
└── index.css          # Estilos globales
```

## Variables de entorno

- `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `VITE_ADMIN_TOKEN`: Token para acceder al panel administrativo

## Próximas fases

- [ ] Fase 2: Integración completa con Supabase
- [ ] Fase 3: Autenticación de jugadores
- [ ] Fase 4: Sistema de votación con cierre automático
- [ ] Fase 5: Pistas aleatorias y checkpoints
- [ ] Fase 6: Panel administrativo completo
- [ ] Fase 7: Deploy en GitHub Pages

## Licencia

MIT
