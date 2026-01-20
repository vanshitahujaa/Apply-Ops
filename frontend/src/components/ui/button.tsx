import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]',
    {
        variants: {
            variant: {
                default: 'bg-violet-600 text-white hover:bg-violet-700 shadow-md hover:shadow-lg',
                destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
                outline: 'border border-zinc-800 bg-transparent text-zinc-100 hover:bg-zinc-800/50 hover:border-zinc-700',
                secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
                ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
                link: 'text-violet-400 underline-offset-4 hover:underline p-0 h-auto',
                gradient: 'btn-gradient',
            },
            size: {
                default: 'h-10 px-5 py-2',
                sm: 'h-9 rounded-lg px-4 text-sm',
                lg: 'h-12 rounded-xl px-6 text-base',
                xl: 'h-14 rounded-2xl px-8 text-lg',
                icon: 'h-10 w-10 p-0',
                'icon-sm': 'h-8 w-8 p-0 rounded-lg',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
