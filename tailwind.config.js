/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /*
       * ESCALA DE SALA. Seis pasos, razón 1,25, anclados en el cuerpo del
       * relato (`--paso-0`, fluido). Cada nombre es un PAPEL, no un tamaño,
       * para que ningún par de jerarquías vuelva a compartir medida.
       *
       * El interlineado y el tracking viajan dentro del token: no se vuelve a
       * escribir un `leading-*` ni un `tracking-*` suelto salvo donde se anula
       * a propósito. Ojo: Tailwind emite las font-size por orden alfabético de
       * clase, así que `.text-xs` sale DESPUÉS de `.text-rotulo` y le gana si
       * conviven; por eso hay que quitar los `text-xs`/`text-sm` de las bases,
       * no solo taparlos.
       */
      fontSize: {
        rotulo: ['var(--paso-menos2)', { lineHeight: '1.35', letterSpacing: '0.09em' }],
        apoyo: ['var(--paso-menos1)', { lineHeight: '1.45' }],
        cuerpo: ['var(--paso-0)', { lineHeight: '1.55' }],
        accion: ['var(--paso-1)', { lineHeight: '1.25' }],
        cifra: ['var(--paso-2)', { lineHeight: '1', letterSpacing: '-0.015em' }],
        titulo: ['var(--paso-3)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      /*
       * HUECOS ESTRUCTURALES: 0,62 del cuerpo, pero nunca más de lo que la
       * altura de la ventana puede pagar. A partir de `lg` el layout está
       * clavado a la ventana, y un espaciado que crece sólo con el ancho
       * acaba comiéndose el relato que dice proteger.
       */
      spacing: {
        'hueco-25': 'calc(var(--hueco) * 0.25)',
        'hueco-50': 'calc(var(--hueco) * 0.5)',
        'hueco-75': 'calc(var(--hueco) * 0.75)',
        hueco: 'var(--hueco)',
        'hueco-150': 'calc(var(--hueco) * 1.5)',
        'hueco-200': 'calc(var(--hueco) * 2)',
      },
      /*
       * Pilas del sistema. No lidera con `-apple-system`: en Windows no
       * resuelve y en macOS fija la variante antigua. Las familias de emoji
       * al final son obligatorias: `Stage` pinta `scene.art` heredando de body.
       */
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans"',
          '"Liberation Sans"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Noto Color Emoji"',
        ],
        mono: [
          'ui-monospace',
          '"SF Mono"',
          '"Cascadia Mono"',
          '"Segoe UI Mono"',
          '"Roboto Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Cortinilla entre escenas: cubre y se retira.
        curtain: {
          '0%': { opacity: '1' },
          '60%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        // Confirmación de una acción: un rebote corto, sin aspavientos.
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        // Un hecho nuevo entrando en la memoria.
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-6px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        // Urgencia al quedar pocos segundos.
        urgent: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        curtain: 'curtain 0.9s ease-in-out forwards',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        pop: 'pop 0.28s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        urgent: 'urgent 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
