import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-paper-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-paper',
        destructive:
          'bg-destructive text-destructive-foreground shadow-paper-sm hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-paper',
        outline:
          'border-2 border-border bg-paper hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5',
        secondary:
          'bg-secondary text-secondary-foreground shadow-paper-sm hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-paper',
        accent:
          'bg-accent text-accent-foreground shadow-paper-sm hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-paper',
        violet:
          'bg-primary-violet text-primary-foreground shadow-paper-sm hover:-translate-y-0.5 hover:bg-primary-violet/90 hover:shadow-paper',
        ghost: 'hover:bg-primary/10 hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
