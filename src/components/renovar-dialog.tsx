import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconeServico } from "@/components/marca"
import { Vagas } from "@/components/vagas"
import { useDados } from "@/hooks/useDados"
import { renovarVenda } from "@/lib/db"
import { dataHora, hora, mt, quando } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LIMITE_POR_PERFIL, diasRestantes, estadoDe, ocupacao, pacoteDe, somarDias } from "@/lib/vendas"
import type { Venda } from "@/lib/types"

interface Props {
  venda: Venda | null
  onFechar: () => void
  onRenovada: (nova: Venda) => void
}

export function RenovarDialog({ venda, onFechar, onRenovada }: Props) {
  return (
    <Dialog open={Boolean(venda)} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        {venda && <Conteudo key={venda.id} venda={venda} onRenovada={onRenovada} />}
      </DialogContent>
    </Dialog>
  )
}

function Conteudo({ venda, onRenovada }: { venda: Venda; onRenovada: (v: Venda) => void }) {
  const { contas, vendas, agora } = useDados()
  const conta = contas[venda.servico]
  const pacotes = conta?.pacotes ?? []
  const perfis = conta?.perfis ?? []

  // a venda antiga deixa de contar porque passa a "renovado"
  const ocup = useMemo(() => ocupacao(vendas, venda.servico, agora, venda.id), [vendas, venda, agora])

  const aindaAtiva = venda.dataExpiracao !== null && venda.dataExpiracao > agora
  const [modo, setModo] = useState<"continuar" | "hoje">(aindaAtiva ? "continuar" : "hoje")
  const [pacoteNome, setPacoteNome] = useState(
    pacoteDe(conta, venda.pacote) ? venda.pacote : (pacotes[0]?.nome ?? ""),
  )
  const perfilAntigoLivre = (ocup[venda.perfil] ?? 0) < LIMITE_POR_PERFIL && perfis.some((p) => p.nome === venda.perfil)
  const [perfil, setPerfil] = useState(
    perfilAntigoLivre ? venda.perfil : (perfis.find((p) => (ocup[p.nome] ?? 0) < LIMITE_POR_PERFIL)?.nome ?? ""),
  )
  const pacote = pacoteDe(conta, pacoteNome)
  const [preco, setPreco] = useState(String(pacote?.preco ?? venda.precoMZN))
  const [aGuardar, setAGuardar] = useState(false)

  useEffect(() => {
    if (pacote) setPreco(String(pacote.preco))
  }, [pacote])

  const inicio = modo === "continuar" && venda.dataExpiracao ? venda.dataExpiracao : agora
  const fim = somarDias(inicio, pacote?.dias ?? 30)
  const valor = Number(preco.replace(",", ".")) || 0

  const confirmar = async () => {
    if (!pacote || !perfil) {
      toast.error("Escolha o pacote e o perfil")
      return
    }
    setAGuardar(true)
    const dados = {
      nomeCliente: venda.nomeCliente,
      telefone: venda.telefone,
      emailCliente: venda.emailCliente,
      servico: venda.servico,
      pacote: pacote.nome,
      perfil,
      precoMZN: valor,
      dataRegisto: inicio,
      dataExpiracao: fim,
      status: "ativo",
    }
    try {
      const id = await renovarVenda(venda, dados)
      toast.success("Renovação registada")
      onRenovada({ ...venda, ...dados, id, renovadoDe: venda.id, renovadoPara: undefined, extra: {} })
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível renovar", { description: "Verifique a ligação à internet." })
    } finally {
      setAGuardar(false)
    }
  }

  const estado = estadoDe(venda, agora)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl">
          <RefreshCwIcon className="size-5" /> Renovar
        </DialogTitle>
        <DialogDescription>Cria uma venda nova e guarda a anterior no histórico do cliente.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        <IconeServico servico={venda.servico} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{venda.nomeCliente}</p>
          <p className="truncate text-xs text-ink-soft">
            {venda.servico} · {venda.perfil} · {venda.pacote}
          </p>
        </div>
        <span
          className={cn(
            "num text-right text-xs font-semibold",
            estado === "expirado" ? "text-coral-ink" : estado === "a-expirar" ? "text-ink" : "text-verde",
          )}
        >
          {quando(diasRestantes(venda, agora), estado === "expirado", venda.dataExpiracao)}
        </span>
      </div>

      {aindaAtiva && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["continuar", "Somar ao tempo que falta", `começa a ${dataHora(venda.dataExpiracao)}`],
              ["hoje", "Começar hoje", `começa agora (${hora(agora)})`],
            ] as const
          ).map(([m, t, s]) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={cn(
                "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                modo === m ? "border-ink bg-paper-2 stamp-shadow-sm" : "border-ink/15 hover:border-ink/40",
              )}
            >
              <span className="block text-sm font-extrabold">{t}</span>
              <span className="num block text-xs text-ink-soft">{s}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Pacote</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pacotes.map((p) => (
            <button
              key={p.nome}
              type="button"
              onClick={() => setPacoteNome(p.nome)}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-left transition-all",
                p.nome === pacoteNome ? "border-ink bg-sol stamp-shadow-sm" : "border-ink/15 bg-paper-2 hover:border-ink/40",
              )}
            >
              <span className="block text-sm font-extrabold">{p.nome}</span>
              <span className="num block text-xs text-ink-soft">{mt(p.preco)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-3">
        <div className="space-y-2">
          <Label>Perfil</Label>
          <Select value={perfil} onValueChange={setPerfil}>
            <SelectTrigger>
              <SelectValue placeholder="Escolher perfil" />
            </SelectTrigger>
            <SelectContent>
              {perfis.map((p) => {
                const usadas = ocup[p.nome] ?? 0
                const cheio = usadas >= LIMITE_POR_PERFIL
                return (
                  <SelectItem key={p.nome} value={p.nome} disabled={cheio}>
                    <span className="flex items-center gap-3">
                      {p.nome}
                      <Vagas usadas={usadas} />
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {!perfilAntigoLivre && (
            <p className="text-xs text-muted-foreground">O perfil anterior ({venda.perfil}) está cheio; foi escolhido outro.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco-renov">Valor (MT)</Label>
          <Input id="preco-renov" inputMode="decimal" className="num" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-ink/30 px-4 py-3">
        <div className="num text-sm">
          <span className="text-muted-foreground">Novo fim </span>
          <b>{dataHora(fim)}</b>
        </div>
        <span className="num text-lg font-semibold">{mt(valor)}</span>
      </div>

      <Button size="lg" variant="coral" onClick={confirmar} disabled={aGuardar || !pacote || !perfil}>
        {aGuardar && <Loader2Icon className="animate-spin" />}
        Confirmar renovação
      </Button>
    </>
  )
}
