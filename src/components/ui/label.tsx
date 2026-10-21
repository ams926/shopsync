import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft select-none",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
