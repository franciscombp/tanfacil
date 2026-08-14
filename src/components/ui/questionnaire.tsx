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
  <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props} />
))
Questionnaire.displayName = 'Questionnaire'

const QuestionnaireQuestion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { description?: React.ReactNode }
>(({ className, children, description, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-0.5', className)} {...props}>
    <h2 className="text-lg font-semibold leading-none tracking-tight">{children}</h2>
    {description ? (
      <p className="text-sm text-muted-foreground">{description}</p>
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
    className={cn('grid gap-3 sm:grid-cols-2', className)}
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
  /** Ya se intentó este camino: se apaga con claridad, sin desaparecer. */
  spent?: boolean
}

const QuestionnaireOption = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  QuestionnaireOptionProps
>(
  (
    { className, label, badge, revealed, count = 0, share = 0, winner, spent, ...props },
    ref
  ) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border-2 border-input bg-card p-4 text-left transition-all duration-150 sm:gap-3',
        'hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent hover:shadow-lg hover:shadow-primary/5',
        'active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none',
        // Desactivada por "ya intentado": se apaga de verdad, pero se lee.
        spent ? 'opacity-35 saturate-50' : 'disabled:opacity-45',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:shadow-lg data-[state=checked]:shadow-primary/10',
        winner && 'border-primary ring-2 ring-primary/40',
        className
      )}
      {...props}
    >
      {/* Barra de resultado, detrás del contenido */}
      {revealed ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-700 ease-out"
          style={{ width: `${share}%` }}
        />
      ) : null}

      {badge ? (
        <span
          aria-hidden
          className={cn(
            'relative grid size-7 shrink-0 place-items-center rounded-lg border-2 border-input bg-secondary text-sm font-bold text-secondary-foreground transition-colors sm:size-9 sm:text-base',
            'group-hover:border-primary/60',
            'group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground'
          )}
        >
          <span className="group-data-[state=checked]:hidden">{badge}</span>
          <Check
            className="hidden size-4 animate-pop group-data-[state=checked]:block sm:size-5"
            strokeWidth={3}
          />
        </span>
      ) : null}

      <span className="relative flex-1 text-[13px] font-medium leading-snug sm:text-base">
        {label}
      </span>

      {revealed ? (
        <span
          className={cn(
            'relative min-w-8 animate-pop text-right text-xl font-bold tabular-nums',
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
      'flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground',
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
