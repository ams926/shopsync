import { cn } from "@/lib/utils"
import { LIMITE_POR_PERFIL } from "@/lib/vendas"

/** Pequenos quadrados que mostram as vagas ocupadas de um perfil. */
export function Vagas({ usadas, destaque = false, className }: { usadas: number; destaque?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)} aria-label={`${usadas} de ${LIMITE_POR_PERFIL} vagas ocupadas`}>
      {Array.from({ length: LIMITE_POR_PERFIL }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-4 rounded-[2px] border-[1.5px] border-ink",
            i < usadas ? (usadas >= LIMITE_POR_PERFIL ? "bg-coral" : "bg-ink") : "bg-transparent",
            i === usadas && destaque && "bg-sol",
          )}
        />
      ))}
    </span>
  )
}
