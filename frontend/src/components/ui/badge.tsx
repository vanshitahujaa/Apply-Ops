import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
                secondary: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
                success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
                warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
                danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
                outline: 'border border-zinc-700 text-zinc-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
