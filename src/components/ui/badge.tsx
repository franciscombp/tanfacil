import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  /*
   * El tamaño baja a la base a propósito: un `text-xs` aquí gana a un
   * `text-rotulo` pasado por `className`, porque Tailwind emite `.text-xs`
   * después de `.text-rotulo` por orden alfabético. Con él dentro, las
   * insignias se quedaban en 12px fijos a 1920 dijera lo que dijera la escala.
   */
  'inline-flex items-center gap-1 rounded-full border px-hueco-50 py-[0.15em] text-rotulo font-semibold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-[1.1em]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
