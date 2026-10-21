import { useMemo, useState } from "react"
import { ChevronDownIcon, MessageCircleIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cabecalho } from "@/components/shell"
import { Carimbo, EtiquetaServico } from "@/components/marca"
import { VendaCard } from "@/components/venda-card"
import { useDados } from "@/hooks/useDados"
import { data, iniciais, mt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { abrirWhatsApp } from "@/lib/whatsapp"
import { chaveCliente, estadoDe } from "@/lib/vendas"
import type { EstadoVenda, Venda } from "@/lib/types"

interface Cliente {
  chave: string
  nome: string
  telefone: string
  vendas: Venda[]
  total: number
  ultima: Date
  estado: EstadoVenda
  servicos: string[]
}

const PESO: Record<EstadoVenda, number> = { "a-expirar": 0, ativo: 1, pendente: 2, expirado: 3, renovado: 4 }
const CORES_AVATAR = ["bg-coral", "bg-azul text-white", "bg-sol", "bg-bordo text-white", "bg-roxo text-white"]

export function Clientes() {
  const { vendas, agora } = useDados()
  const [termo, setTermo] = useState("")
  const [aberto, setAberto] = useState<string | null>(null)

  const clientes = useMemo(() => {
    const mapa = new Map<string, Venda[]>()
    for (const v of vendas) {
      const k = chaveCliente(v)
      mapa.set(k, [...(mapa.get(k) ?? []), v])
    }
    const lista: Cliente[] = []
    for (const [chave, vs] of mapa) {
      vs.sort((a, b) => b.dataRegisto.getTime() - a.dataRegisto.getTime())
      const estados = vs.map((v) => estadoDe(v, agora))
      const melhor = estados.sort((a, b) => PESO[a] - PESO[b])[0] ?? "expirado"
      lista.push({
        chave,
        nome: vs[0].nomeCliente,
        telefone: vs[0].telefone,
        vendas: vs,
        total: vs.filter((v) => v.status !== "pendente").reduce((s, v) => s + v.precoMZN, 0),
        ultima: vs[0].dataRegisto,
        estado: melhor === "renovado" ? "expirado" : melhor,
        servicos: [...new Set(vs.map((v) => v.servico))],
      })
    }
    return lista.sort((a, b) => b.ultima.getTime() - a.ultima.getTime())
  }, [vendas, agora])

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase()
    if (!t) return clientes
    const d = t.replace(/\D/g, "")
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.telefone.replace(/\D/g, "").includes(d)),
    )
  }, [clientes, termo])

  const ativos = clientes.filter((c) => c.estado === "ativo" || c.estado === "a-expirar").length

  return (
    <>
      <Cabecalho etiqueta="carteira" titulo="Clientes">
        <p className="num text-sm text-muted-foreground">
          {ativos} ativos · {clientes.length} no total
        </p>
      </Cabecalho>

      <div className="relative mb-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Procurar cliente" className="pl-9" />
      </div>

      <div className="grid gap-2">
        {filtrados.map((c, i) => {
          const expandido = aberto === c.chave
          return (
            <div key={c.chave} className="rounded-xl border-[1.5px] border-ink/80 bg-paper-2">
              <div className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-sm font-extrabold",
                    CORES_AVATAR[i % CORES_AVATAR.length],
                  )}
                >
                  {iniciais(c.nome)}
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setAberto(expandido ? null : c.chave)}>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-extrabold">{c.nome}</span>
                    <Carimbo estado={c.estado} />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                    <span className="num">{c.telefone}</span>
                    {c.servicos.map((s) => (
                      <EtiquetaServico key={s} servico={s} />
                    ))}
                  </span>
                </button>
                <div className="hidden text-right sm:block">
                  <p className="num text-sm font-semibold">{mt(c.total)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.vendas.length} {c.vendas.length === 1 ? "compra" : "compras"} · última {data(c.ultima)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Abrir conversa no WhatsApp"
                  onClick={() => abrirWhatsApp(c.telefone)}
                  disabled={!c.telefone}
                >
                  <MessageCircleIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={expandido ? "Fechar histórico" : "Ver histórico"}
                  onClick={() => setAberto(expandido ? null : c.chave)}
                >
                  <ChevronDownIcon className={cn("transition-transform", expandido && "rotate-180")} />
                </Button>
              </div>
              {expandido && (
                <div className="space-y-2 border-t-[1.5px] border-dashed border-ink/20 p-3">
                  <p className="num text-xs text-muted-foreground sm:hidden">
                    {c.vendas.length} compras · {mt(c.total)}
                  </p>
                  {c.vendas.map((v) => (
                    <VendaCard key={v.id} venda={v} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-ink/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </p>
        )}
      </div>
    </>
  )
}
