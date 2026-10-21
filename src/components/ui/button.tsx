import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[transform,box-shadow,background-color,color] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-x-[1px] active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-primary-foreground border-2 border-ink stamp-shadow-sm hover:bg-ink/90 active:shadow-none",
        coral:
          "bg-coral text-ink border-2 border-ink stamp-shadow-sm hover:brightness-105 active:shadow-none",
        azul: "bg-azul text-white border-2 border-ink stamp-shadow-sm hover:brightness-105 active:shadow-none",
        whatsapp:
          "bg-[#25D366] text-ink border-2 border-ink stamp-shadow-sm hover:brightness-105 active:shadow-none",
        destructive:
          "bg-destructive text-white border-2 border-ink stamp-shadow-sm hover:bg-destructive/90 active:shadow-none",
        outline: "border-2 border-ink bg-paper-2 hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-ink/[0.06]",
        link: "text-azul-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-6 text-base has-[>svg]:px-5",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
