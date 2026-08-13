import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Check, Circle } from 'lucide-react'

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
  <div ref={ref} className={cn('space-y-1', className)} {...props}>
    <h2 className="text-base font-semibold leading-none tracking-tight">
      {children}
    </h2>
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
    className={cn('grid gap-2 sm:grid-cols-2', className)}
    {...props}
  />
))
QuestionnaireOptions.displayName = 'QuestionnaireOptions'

export interface QuestionnaireOptionProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: React.ReactNode
  /** Muestra el recuento de votos y la barra de resultado. */
  revealed?: boolean
  count?: number
  /** Porcentaje 0-100 usado por la barra de resultado. */
  share?: number
  winner?: boolean
}

const QuestionnaireOption = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  QuestionnaireOptionProps
>(
  (
    { className, label, revealed, count = 0, share = 0, winner, ...props },
    ref
  ) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-md border border-input bg-card p-4 text-left transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-card',
        'data-[state=checked]:border-primary data-[state=checked]:bg-accent',
        winner && 'border-primary ring-1 ring-primary',
        className
      )}
      {...props}
    >
      {/* Barra de resultado, detrás del contenido */}
      {revealed ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-700"
          style={{ width: `${share}%` }}
        />
      ) : null}

      <span
        className={cn(
          'relative flex size-5 shrink-0 items-center justify-center rounded-full border border-primary text-primary',
          'group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground'
        )}
      >
        <RadioGroupPrimitive.Indicator>
          <Check className="size-3.5" strokeWidth={3} />
        </RadioGroupPrimitive.Indicator>
      </span>

      <span className="relative flex-1 text-sm font-medium leading-snug">
        {label}
      </span>

      {revealed ? (
        <span className="relative flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          {winner ? <Circle className="size-2 fill-primary text-primary" /> : null}
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
