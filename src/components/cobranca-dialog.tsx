import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2Icon, CheckIcon, MessageCircleIcon, SkipForwardIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconeServico } from "@/components/marca"
import { useDados } from "@/hooks/useDados"
import { marcarLembrete } from "@/lib/db"
import { quando } from "@/lib/format"
import { cn } from "@/lib/utils"
import { diasRestantes, estadoDe, lembradoHoje, paraCobrar } from "@/lib/vendas"
import { abrirWhatsApp, mensagemCobranca } from "@/lib/whatsapp"
import type { Venda } from "@/lib/types"

export function CobrancaDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-xl">{aberto && <Fila onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}

function Fila({ onFechar }: { onFechar: () => void }) {
  const { vendas, agora } = useDados()
  // a lista fica fixa enquanto a janela está aberta, para não saltar enquanto se trabalha
  const [lista] = useState<Venda[]>(() => paraCobrar(vendas, agora))
  const [feitos, setFeitos] = useState<Set<string>>(() => new Set(lista.filter((v) => lembradoHoje(v, agora)).map((v) => v.id)))
  const [saltados, setSaltados] = useState<Set<string>>(new Set())
  const [atual, setAtual] = useState(() => lista.findIndex((v) => !lembradoHoje(v, agora)))
  const venda = atual >= 0 ? lista[atual] : undefined
  const [texto, setTexto] = useState(() => (venda ? mensagemCobranca(venda, agora) : ""))

  const irPara = (i: number) => {
    setAtual(i)
    setTexto(i >= 0 && lista[i] ? mensagemCobranca(lista[i], agora) : "")
  }
  const proximo = (feitosAgora: Set<string>, saltadosAgora: Set<string>) => {
    const n = lista.findIndex((v, i) => i > atual && !feitosAgora.has(v.id) && !saltadosAgora.has(v.id))
    irPara(n)
  }

  const enviar = () => {
    if (!venda) return
    abrirWhatsApp(venda.telefone, texto)
    marcarLembrete(venda.id).catch((e) => {
      console.error(e)
      toast.error("Não foi possível marcar como lembrado")
    })
    const f = new Set(feitos).add(venda.id)
    setFeitos(f)
    proximo(f, saltados)
  }
  const saltar = () => {
    if (!venda) return
    const s = new Set(saltados).add(venda.id)
    setSaltados(s)
    proximo(feitos, s)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Cobrança do dia</DialogTitle>
        <DialogDescription>
          Quem termina nos próximos 3 dias ou terminou há pouco. Cada envio abre o WhatsApp com a mensagem pronta e passa ao
          seguinte.
        </DialogDescription>
      </DialogHeader>

      {lista.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-ink/20 p-8 text-center font-bold">Ninguém para lembrar hoje.</p>
      ) : (
        <>
          {/* progresso */}
          <div>
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-soft">
              <span>
                {feitos.size} de {lista.length} lembrados
              </span>
              {saltados.size > 0 && <span>{saltados.size} saltados</span>}
            </div>
            <div className="flex gap-1">
              {lista.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => irPara(i)}
                  title={v.nomeCliente}
                  aria-label={`${v.nomeCliente}${feitos.has(v.id) ? ", já lembrado" : ""}`}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    feitos.has(v.id) ? "bg-verde" : saltados.has(v.id) ? "bg-ink/25" : "bg-ink/10",
                    i === atual && "outline-2 outline-offset-1 outline-ink",
                  )}
                />
              ))}
            </div>
          </div>

          {venda ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <IconeServico servico={venda.servico} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{venda.nomeCliente}</p>
                  <p className="num truncate text-xs text-ink-soft">
                    {venda.servico} · {venda.perfil} · {venda.telefone}
                  </p>
                </div>
                <span
                  className={cn(
                    "num shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
                    estadoDe(venda, agora) === "expirado" ? "text-coral-ink" : "bg-sol",
                  )}
                >
                  {quando(diasRestantes(venda, agora), estadoDe(venda, agora) === "expirado")}
                </span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Mensagem</span>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={5}
                  className="w-full resize-y rounded-md border-[1.5px] border-input bg-paper-2 px-3 py-2 text-[14px] outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-azul/25"
                />
              </label>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <Button variant="outline" onClick={saltar}>
                  <SkipForwardIcon /> Saltar
                </Button>
                <Button variant="whatsapp" size="lg" onClick={enviar}>
                  <MessageCircleIcon /> Enviar e passar ao seguinte
                </Button>
              </div>
              {feitos.has(venda.id) && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-verde">
                  <CheckIcon className="size-3.5" /> Já foi lembrado hoje.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border-2 border-ink bg-paper-2 p-6 text-center">
              <CheckCircle2Icon className="mx-auto size-9 text-verde" />
              <div>
                <p className="text-lg font-extrabold">Cobrança terminada</p>
                <p className="text-sm text-muted-foreground">
                  {feitos.size} {feitos.size === 1 ? "cliente lembrado" : "clientes lembrados"}
                  {saltados.size > 0 && ` · ${saltados.size} ficaram para depois`}
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {saltados.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSaltados(new Set())
                      irPara(lista.findIndex((v) => !feitos.has(v.id)))
                    }}
                  >
                    Ver os saltados
                  </Button>
                )}
                <Button onClick={onFechar}>Fechar</Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
