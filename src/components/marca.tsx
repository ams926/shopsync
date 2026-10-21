import logoUrl from "@/assets/shopsync-logo.png"
import marcaUrl from "@/assets/shopsync-mark.png"
import netflixUrl from "@/assets/netflix.svg"
import primeUrl from "@/assets/prime.svg"
import { cn } from "@/lib/utils"
import type { EstadoVenda } from "@/lib/types"

export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="ShopSync" className={cn("h-8 w-auto select-none", className)} draggable={false} />
}

export function MarcaSS({ className }: { className?: string }) {
  return <img src={marcaUrl} alt="" className={cn("size-9 select-none", className)} draggable={false} />
}

/** Cor de cada serviço: o vermelho e o azul vêm dos dois "S" do logótipo. */
export function corServico(servico: string): { fundo: string; texto: string; barra: string } {
  if (/netflix/i.test(servico)) return { fundo: "bg-coral/15", texto: "text-coral-ink", barra: "bg-coral" }
  if (/prime/i.test(servico)) return { fundo: "bg-azul/12", texto: "text-azul-ink", barra: "bg-azul" }
  if (/spotify/i.test(servico)) return { fundo: "bg-verde/12", texto: "text-verde", barra: "bg-verde" }
  return { fundo: "bg-sol/40", texto: "text-roxo", barra: "bg-roxo" }
}

export function IconeServico({ servico, className }: { servico: string; className?: string }) {
  const src = /netflix/i.test(servico) ? netflixUrl : /prime/i.test(servico) ? primeUrl : null
  const cor = corServico(servico)
  return (
    <span
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border-[1.5px] border-ink bg-paper-2",
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-7 object-contain" />
      ) : (
        <span className={cn("text-sm font-extrabold", cor.texto)}>{servico.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  )
}

export function EtiquetaServico({ servico, className }: { servico: string; className?: string }) {
  const cor = corServico(servico)
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold", cor.fundo, cor.texto, className)}>
      <span className={cn("size-1.5 rounded-full", cor.barra)} />
      {servico}
    </span>
  )
}

const ESTADOS: Record<EstadoVenda, { texto: string; classe: string }> = {
  ativo: { texto: "Ativo", classe: "border-verde text-verde" },
  "a-expirar": { texto: "A expirar", classe: "border-ink bg-sol text-ink" },
  expirado: { texto: "Expirado", classe: "border-coral-ink text-coral-ink" },
  pendente: { texto: "Pendente", classe: "border-roxo text-roxo border-dashed" },
  renovado: { texto: "Renovado", classe: "border-ink/40 text-ink/50" },
}

/** Estado em forma de carimbo. */
export function Carimbo({ estado, className }: { estado: EstadoVenda; className?: string }) {
  const e = ESTADOS[estado]
  return (
    <span
      className={cn(
        "inline-flex -rotate-2 items-center rounded-[4px] border-[1.5px] px-1.5 py-[1px] text-[10.5px] font-extrabold uppercase tracking-[0.1em]",
        e.classe,
        className,
      )}
    >
      {e.texto}
    </span>
  )
}

export const textoEstado = (e: EstadoVenda) => ESTADOS[e].texto
