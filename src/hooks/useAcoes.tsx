import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { useDados } from "@/hooks/useDados"
import { abrirWhatsApp, mensagemCobranca, mensagemDados, mensagemRecibo } from "@/lib/whatsapp"
import { baixarRecibo, partilharRecibo } from "@/lib/recibo"
import type { Venda } from "@/lib/types"
import { RenovarDialog } from "@/components/renovar-dialog"
import { AprovarDialog } from "@/components/aprovar-dialog"
import { ApagarDialog, EditarDialog, PosVendaDialog } from "@/components/dialogos"
import { CobrancaDialog } from "@/components/cobranca-dialog"
import { marcarLembrete } from "@/lib/db"

type Aberto =
  | { tipo: "renovar"; venda: Venda }
  | { tipo: "editar"; venda: Venda }
  | { tipo: "apagar"; venda: Venda }
  | { tipo: "aprovar"; venda: Venda }
  | { tipo: "pos-venda"; venda: Venda; titulo: string }
  | { tipo: "cobranca" }
  | null

interface AcoesCtx {
  renovar: (v: Venda) => void
  editar: (v: Venda) => void
  apagar: (v: Venda) => void
  aprovar: (v: Venda) => void
  posVenda: (v: Venda, titulo?: string) => void
  enviarDados: (v: Venda) => void
  cobrar: (v: Venda) => void
  baixar: (v: Venda) => Promise<void>
  partilhar: (v: Venda) => Promise<void>
  /** abre a fila de lembretes do dia */
  cobrancaDoDia: () => void
}

const Ctx = createContext<AcoesCtx | null>(null)

export function AcoesProvider({ children }: { children: ReactNode }) {
  const { contas } = useDados()
  const [aberto, setAberto] = useState<Aberto>(null)
  const fechar = () => setAberto(null)

  const enviarDados = useCallback(
    (v: Venda) => abrirWhatsApp(v.telefone, mensagemDados(v, contas[v.servico])),
    [contas],
  )
  const cobrar = useCallback((v: Venda) => {
    abrirWhatsApp(v.telefone, mensagemCobranca(v))
    marcarLembrete(v.id).catch((e) => console.error(e))
  }, [])
  const baixar = useCallback(
    async (v: Venda) => {
      try {
        await baixarRecibo(v, contas[v.servico])
        toast.success("Recibo descarregado")
      } catch (e) {
        console.error(e)
        toast.error("Não foi possível criar o recibo")
      }
    },
    [contas],
  )
  const partilhar = useCallback(
    async (v: Venda) => {
      try {
        const r = await partilharRecibo(v, contas[v.servico], mensagemRecibo(v))
        if (r === "descarregado") {
          toast("Recibo descarregado", {
            description: "Neste aparelho não dá para anexar diretamente. Abrimos o WhatsApp do cliente: basta arrastar o PDF para a conversa.",
            duration: 7000,
          })
          abrirWhatsApp(v.telefone, mensagemRecibo(v))
        }
      } catch (e) {
        console.error(e)
        toast.error("Não foi possível partilhar o recibo")
      }
    },
    [contas],
  )

  const valor: AcoesCtx = {
    renovar: (venda) => setAberto({ tipo: "renovar", venda }),
    editar: (venda) => setAberto({ tipo: "editar", venda }),
    apagar: (venda) => setAberto({ tipo: "apagar", venda }),
    aprovar: (venda) => setAberto({ tipo: "aprovar", venda }),
    posVenda: (venda, titulo = "Venda registada") => setAberto({ tipo: "pos-venda", venda, titulo }),
    enviarDados,
    cobrar,
    baixar,
    partilhar,
    cobrancaDoDia: () => setAberto({ tipo: "cobranca" }),
  }

  return (
    <Ctx.Provider value={valor}>
      {children}
      <RenovarDialog
        venda={aberto?.tipo === "renovar" ? aberto.venda : null}
        onFechar={fechar}
        onRenovada={(nova) => setAberto({ tipo: "pos-venda", venda: nova, titulo: "Renovação feita" })}
      />
      <AprovarDialog
        venda={aberto?.tipo === "aprovar" ? aberto.venda : null}
        onFechar={fechar}
        onAprovada={(v) => setAberto({ tipo: "pos-venda", venda: v, titulo: "Pedido aprovado" })}
      />
      <CobrancaDialog aberto={aberto?.tipo === "cobranca"} onFechar={fechar} />
      <EditarDialog venda={aberto?.tipo === "editar" ? aberto.venda : null} onFechar={fechar} />
      <ApagarDialog venda={aberto?.tipo === "apagar" ? aberto.venda : null} onFechar={fechar} />
      <PosVendaDialog
        venda={aberto?.tipo === "pos-venda" ? aberto.venda : null}
        titulo={aberto?.tipo === "pos-venda" ? aberto.titulo : ""}
        onFechar={fechar}
      />
    </Ctx.Provider>
  )
}

export function useAcoes() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAcoes fora do AcoesProvider")
  return c
}
