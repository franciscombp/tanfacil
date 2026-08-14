import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Questionnaire
 *
 * Equivalente local del componente `questionnaire` de shadcn/ui: el registro
 * (ui.shadcn.com) no es accesible desde este entorno, así que se implementa con
 * las mismas primitivas de Radix y los mismos tokens de tema que usa shadcn.
 * Si más adelante se instala el oficial, sólo hay que sustituir este archivo.
 */

const Questionnaire = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-2 lg:gap-hueco', className)} {...props} />
))
Questionnaire.displayName = 'Questionnaire'

const QuestionnaireQuestion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { description?: React.ReactNode }
>(({ className, children, description, ...props }, ref) => (
  /*
   * «¿Qué hacemos?» es idéntico en las 39 escenas: información cero. Que
   * compitiera en tamaño con el relato era parte del problema de jerarquía.
   * Baja a rótulo y libera el tamaño para las opciones, que sí cambian cada
   * ronda. Fuera `leading-none`: con interlineado 1 se recortaban el «¿» y la
   * tilde de «Qué». La descripción pierde el gris: es la instrucción viva
   * («Quedan 18s») y tiene que leerse sin esfuerzo.
   */
  <div ref={ref} className={cn('min-w-0', className)} {...props}>
    <h2 className="text-rotulo font-semibold uppercase text-muted-foreground">{children}</h2>
    {description ? (
      <p className="mt-[0.35em] text-apoyo text-foreground">{description}</p>
    ) : null}
  </div>
))
QuestionnaireQuestion.displayName = 'QuestionnaireQuestion'

const QuestionnaireOptions = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('grid gap-2.5 lg:gap-hueco', className)}
    {...props}
  />
))
QuestionnaireOptions.displayName = 'QuestionnaireOptions'

export interface QuestionnaireOptionProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: React.ReactNode
  /** Letra que identifica la opción: se vota «la B» en voz alta. */
  badge?: string
  /** Muestra el recuento de votos y la barra de resultado. */
  revealed?: boolean
  count?: number
  /** Porcentaje 0-100 usado por la barra de resultado. */
  share?: number
  winner?: boolean
  /**
   * Estado según las reglas, no según quién mira. El facilitador recibe todas
   * las opciones inertes porque no vota, y atenuar por el atributo `disabled`
   * dejaba la pantalla proyectada —la que ve la sala— con las cuatro opciones
   * apagadas por igual y la ganadora del revelado también.
   */
  state?: 'active' | 'spent' | 'outOfRunoff'
}

const QuestionnaireOption = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  QuestionnaireOptionProps
>(
  (
    {
      className,
      label,
      badge,
      revealed,
      count = 0,
      share = 0,
      winner,
      state = 'active',
      ...props
    },
    ref
  ) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        // La geometría del botón no se ata al ritmo por debajo de `lg`: en el
        // teléfono la opción es un destino táctil, no prosa, y el pie ya ocupa
        // media pantalla. `p-3 gap-2.5` son los valores de hoy.
        'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border-2 border-input bg-card p-3 text-left transition-all duration-150 lg:gap-hueco-75 lg:border-[3px] lg:p-hueco 2xl:rounded-2xl',
        'hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent hover:shadow-lg hover:shadow-primary/5',
        'active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none',
        /*
         * La atenuación depende de la regla, nunca de quién mira: en la
         * pantalla proyectada todas las opciones están inertes y aun así
         * tienen que leerse. Además de la opacidad, cada estado lleva una
         * señal de forma —borde discontinuo, tachado— para que se distinga
         * de lejos y sin depender del color.
         */
        state === 'spent' && 'border-dashed opacity-40',
        state === 'outOfRunoff' && 'opacity-60',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:shadow-lg data-[state=checked]:shadow-primary/10',
        winner && 'border-primary ring-2 ring-primary/40 lg:ring-4',
        className
      )}
      {...props}
    >
      {/*
        Barra de resultado, detrás del contenido. Se monta siempre y crece
        desde cero: montándola ya con su anchura final, la transición no
        llegaba a correr nunca y el recuento aparecía de golpe, justo en el
        momento que la sala está mirando.
      */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 transition-[width] duration-700 ease-out',
          // Al 12% la barra daba 1,21:1 sobre la tarjeta: en la sala no
          // existía. Suben las dos, manteniendo la distancia entre ganadora
          // y resto.
          winner ? 'bg-primary/35' : 'bg-primary/20'
        )}
        style={{
          width: revealed ? `${share}%` : '0%',
          transitionDelay: winner ? '160ms' : '0ms',
        }}
      />

      {badge ? (
        <span
          aria-hidden
          className={cn(
            // Se vota «la B» en voz alta: la letra es la señalización de la
            // sala. Desde `lg` la caja se mide en em contra su propia letra y
            // no vuelve a tocarse. Móvil y sm conservan los 28 y 36 px de hoy,
            // para no romper la rejilla 2x2 del teléfono.
            'relative grid size-7 shrink-0 place-items-center rounded-lg border-2 border-input bg-secondary text-apoyo font-bold text-secondary-foreground transition-colors sm:size-9 sm:text-cuerpo lg:size-[1.7em] lg:rounded-xl lg:text-accion',
            'group-hover:border-primary/60',
            'group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground'
          )}
        >
          <span className="group-data-[state=checked]:hidden">{badge}</span>
          <Check
            className="hidden size-4 animate-pop group-data-[state=checked]:block sm:size-5 lg:size-[0.9em]"
            strokeWidth={3}
          />
        </span>
      ) : null}

      {/*
        `min-w-0` arregla un recorte, no es cosmética: sin él el suelo
        min-content de la etiqueta impide que encoja y, como el botón lleva
        `overflow-hidden`, lo que se recorta en el revelado es el recuento —el
        número que mira la sala—. A 390 px le pasaba a 48 de las 99 opciones.
        Semibold y no medium: sobre azul oscuro y proyectado, el peso 500
        pierde trazo. En el móvil se queda en el tamaño de hoy.
      */}
      <span className="relative min-w-0 flex-1 text-pretty text-apoyo font-semibold leading-snug sm:text-cuerpo lg:text-accion lg:leading-tight">
        {label}
      </span>

      {revealed ? (
        <span
          className={cn(
            // `shrink-0` por lo mismo que el `min-w-0` de la etiqueta: sin él
            // esto es lo primero que se lleva por delante el `overflow-hidden`.
            'relative min-w-[1.6em] shrink-0 animate-pop text-right text-cifra font-bold tabular-nums',
            winner ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {count}
        </span>
      ) : null}
    </RadioGroupPrimitive.Item>
  )
)
QuestionnaireOption.displayName = 'QuestionnaireOption'

const QuestionnaireFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-wrap items-center justify-between gap-hueco-75 text-apoyo text-muted-foreground',
      className
    )}
    {...props}
  />
))
QuestionnaireFooter.displayName = 'QuestionnaireFooter'

export {
  Questionnaire,
  QuestionnaireQuestion,
  QuestionnaireOptions,
  QuestionnaireOption,
  QuestionnaireFooter,
}
