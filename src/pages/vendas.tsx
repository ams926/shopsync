import { useEffect, useMemo, useState } from "react"
import { FileSpreadsheetIcon, Loader2Icon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { exportarExcel } from "@/lib/excel"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Cabecalho } from "@/components/shell"
import { VendaCard } from "@/components/venda-card"
import { useDados } from "@/hooks/useDados"
import { useNav } from "@/hooks/useNav"
import { cn } from "@/lib/utils"
import { estadoDe } from "@/lib/vendas"
import type { EstadoVenda } from "@/lib/types"

type Filtro = "todas" | EstadoVenda

const FILTROS: { id: Filtro; nome: string }[] = [
  { id: "todas", nome: "Todas" },
  { id: "ativo", nome: "Ativas" },
  { id: "a-expirar", nome: "A expirar" },
  { id: "expirado", nome: "Expiradas" },
  { id: "pendente", nome: "Pendentes" },
  { id: "renovado", nome: "Já renovadas" },
]

const POR_PAGINA = 40

export function Vendas() {
  const { vendas, servicos, contas, agora } = useDados()
  const [aExportar, setAExportar] = useState(false)
  const exportar = async () => {
    setAExportar(true)
    try {
      await exportarExcel(vendas, contas, servicos, agora)
      toast.success("Excel descarregado")
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível criar o Excel")
    } finally {
      setAExportar(false)
    }
  }
  const nav = useNav()
  const [termo, setTermo] = useState("")
  const [filtro, setFiltro] = useState<Filtro>((nav.filtro as Filtro) ?? "todas")
  const [servico, setServico] = useState("todos")
  const [ordem, setOrdem] = useState<"recentes" | "termina">("recentes")
  const [limite, setLimite] = useState(POR_PAGINA)

  useEffect(() => {
    if (nav.filtro) setFiltro(nav.filtro as Filtro)
  }, [nav.filtro])

  useEffect(() => setLimite(POR_PAGINA), [termo, filtro, servico, ordem])

  const comEstado = useMemo(() => vendas.map((v) => ({ v, e: estadoDe(v, agora) })), [vendas, agora])

  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { todas: 0, ativo: 0, "a-expirar": 0, expirado: 0, pendente: 0, renovado: 0 }
    for (const { v, e } of comEstado) {
      if (servico !== "todos" && v.servico !== servico) continue
      c[e]++
      if (e !== "renovado") c.todas++
    }
    return c
  }, [comEstado, servico])

  const lista = useMemo(() => {
    const t = termo.trim().toLowerCase()
    const tDig = t.replace(/\D/g, "")
    return comEstado
      .filter(({ v, e }) => {
        if (servico !== "todos" && v.servico !== servico) return false
        if (filtro === "todas" ? e === "renovado" : e !== filtro) return false
        if (!t) return true
        return (
          v.nomeCliente.toLowerCase().includes(t) ||
          v.perfil.toLowerCase().includes(t) ||
          v.emailCliente.toLowerCase().includes(t) ||
          (tDig.length >= 3 && v.telefone.replace(/\D/g, "").includes(tDig))
        )
      })
      .sort((a, b) =>
        ordem === "recentes"
          ? b.v.dataRegisto.getTime() - a.v.dataRegisto.getTime()
          : (a.v.dataExpiracao?.getTime() ?? 0) - (b.v.dataExpiracao?.getTime() ?? 0),
      )
      .map(({ v }) => v)
  }, [comEstado, termo, filtro, servico, ordem])

  return (
    <>
      <Cabecalho etiqueta="registos" titulo="Vendas">
        <div className="flex items-center gap-3">
          <p className="num hidden text-sm text-muted-foreground sm:block">{vendas.length} no total</p>
          <Button variant="outline" onClick={() => void exportar()} disabled={aExportar}>
            {aExportar ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />}
            Excel
          </Button>
        </div>
      </Cabecalho>

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_170px]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Procurar nome, telefone ou perfil"
            className="pl-9"
          />
        </div>
        <Select value={servico} onValueChange={setServico}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os serviços</SelectItem>
            {servicos.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais recentes</SelectItem>
            <SelectItem value="termina">Terminam primeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => {
          const ativo = filtro === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold transition-colors",
                ativo ? "border-ink bg-ink text-primary-foreground" : "border-ink/20 hover:border-ink/50",
              )}
            >
              {f.nome}
              <span className={cn("num text-[11px]", ativo ? "text-sol" : "text-muted-foreground")}>{contagem[f.id]}</span>
            </button>
          )
        })}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-ink/20 px-6 py-14 text-center">
          <p className="text-lg font-extrabold">Nenhuma venda aqui.</p>
          <p className="mt-1 text-sm text-muted-foreground">Experimente outro filtro ou outra pesquisa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.slice(0, limite).map((v) => (
            <VendaCard key={v.id} venda={v} />
          ))}
          {lista.length > limite && (
            <button
              onClick={() => setLimite((l) => l + POR_PAGINA)}
              className="w-full rounded-xl border-2 border-dashed border-ink/25 py-3 text-sm font-bold text-ink-soft hover:border-ink/50 hover:text-ink"
            >
              Mostrar mais ({lista.length - limite})
            </button>
          )}
        </div>
      )}
    </>
  )
}
