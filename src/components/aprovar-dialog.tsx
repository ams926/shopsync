import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Vagas } from "@/components/vagas"
import { useDados } from "@/hooks/useDados"
import { aprovarVenda } from "@/lib/db"
import { dataHora, mt } from "@/lib/format"
import { LIMITE_POR_PERFIL, ocupacao, pacoteDe, somarDias } from "@/lib/vendas"
import type { Venda } from "@/lib/types"

/** Pedidos "pendentes" que vieram da loja antiga. */
export function AprovarDialog({
  venda,
  onFechar,
  onAprovada,
}: {
  venda: Venda | null
  onFechar: () => void
  onAprovada: (v: Venda) => void
}) {
  return (
    <Dialog open={Boolean(venda)} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>{venda && <Conteudo key={venda.id} venda={venda} onAprovada={onAprovada} />}</DialogContent>
    </Dialog>
  )
}

function Conteudo({ venda, onAprovada }: { venda: Venda; onAprovada: (v: Venda) => void }) {
  const { contas, vendas, agora } = useDados()
  const conta = contas[venda.servico]
  const ocup = useMemo(() => ocupacao(vendas, venda.servico, agora, venda.id), [vendas, venda, agora])
  const perfis = conta?.perfis ?? []
  const [perfil, setPerfil] = useState(perfis.find((p) => (ocup[p.nome] ?? 0) < LIMITE_POR_PERFIL)?.nome ?? "")
  const [aGuardar, setAGuardar] = useState(false)

  const dias = pacoteDe(conta, venda.pacote)?.dias ?? venda.diasPacote ?? 30
  const fim = somarDias(agora, dias)

  const confirmar = async () => {
    if (!perfil) return
    setAGuardar(true)
    const dados = { perfil, dataRegisto: agora, dataExpiracao: fim, pacote: venda.pacote, precoMZN: venda.precoMZN }
    try {
      await aprovarVenda(venda.id, dados)
      onAprovada({ ...venda, ...dados, status: "ativo" })
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível aprovar")
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Aprovar pedido</DialogTitle>
        <DialogDescription>
          {venda.nomeCliente} pediu {venda.servico} · {venda.pacote} ({mt(venda.precoMZN)}).
        </DialogDescription>
      </DialogHeader>
      {venda.comprovativo && (
        <p className="rounded-md bg-muted p-3 text-sm break-words">
          <span className="font-semibold">Comprovativo: </span>
          {/^https?:\/\//.test(venda.comprovativo) ? (
            <a href={venda.comprovativo} target="_blank" rel="noreferrer" className="text-azul-ink underline">
              abrir
            </a>
          ) : (
            venda.comprovativo
          )}
        </p>
      )}
      <div className="space-y-2">
        <Label>Perfil a atribuir</Label>
        <Select value={perfil} onValueChange={setPerfil}>
          <SelectTrigger>
            <SelectValue placeholder="Escolher perfil" />
          </SelectTrigger>
          <SelectContent>
            {perfis.map((p) => {
              const usadas = ocup[p.nome] ?? 0
              return (
                <SelectItem key={p.nome} value={p.nome} disabled={usadas >= LIMITE_POR_PERFIL}>
                  <span className="flex items-center gap-3">
                    {p.nome} <Vagas usadas={usadas} />
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <p className="num text-sm text-ink-soft">
        Fica ativo a partir de agora até <b className="text-ink">{dataHora(fim)}</b>.
      </p>
      <Button size="lg" variant="coral" onClick={confirmar} disabled={!perfil || aGuardar}>
        {aGuardar && <Loader2Icon className="animate-spin" />}
        Aprovar
      </Button>
    </>
  )
}
