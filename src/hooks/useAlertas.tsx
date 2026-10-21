import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useDados } from "@/hooks/useDados"
import { useNav } from "@/hooks/useNav"
import { jaAvisouHoje, notificar } from "@/lib/notificacoes"
import { diasRestantes, estadoDe } from "@/lib/vendas"

/**
 * Vigia os dados e avisa:
 *  - ao abrir: resumo de quem termina nos próximos dias (toast + notificação, uma vez por dia);
 *  - a qualquer momento: novos pedidos pendentes e subscrições que terminam hoje.
 */
export function useAlertas() {
  const { vendas, carregado, agora } = useDados()
  const { ir } = useNav()
  const pendentesConhecidos = useRef<Set<string> | null>(null)
  const terminamHojeAvisados = useRef<Set<string>>(new Set())
  const resumoFeito = useRef(false)

  // resumo ao abrir
  useEffect(() => {
    if (!carregado || resumoFeito.current) return
    resumoFeito.current = true

    const aExpirar = vendas.filter((v) => estadoDe(v, agora) === "a-expirar")
    const hoje = aExpirar.filter((v) => diasRestantes(v, agora) === 0)
    const pendentes = vendas.filter((v) => v.status === "pendente")

    if (aExpirar.length > 0) {
      const titulo =
        hoje.length > 0
          ? `${hoje.length} ${hoje.length === 1 ? "cliente termina" : "clientes terminam"} hoje`
          : `${aExpirar.length} ${aExpirar.length === 1 ? "cliente termina" : "clientes terminam"} em breve`
      toast.warning(titulo, {
        description: `${aExpirar.length} no total nos próximos 3 dias. Bom momento para lembrar e renovar.`,
        duration: 9000,
        action: { label: "Ver", onClick: () => ir("vendas", "a-expirar") },
      })
      if (!jaAvisouHoje("resumo")) {
        void notificar("ShopSync · renovações", `${titulo}. Toque para ver.`, "/#/vendas", "resumo-diario")
      }
    }
    if (pendentes.length > 0) {
      toast.info(`${pendentes.length} ${pendentes.length === 1 ? "pedido pendente" : "pedidos pendentes"}`, {
        description: "À espera de aprovação.",
        action: { label: "Ver", onClick: () => ir("vendas", "pendente") },
      })
    }
    for (const v of hoje) terminamHojeAvisados.current.add(v.id)
  }, [carregado, vendas, agora, ir])

  // novos pedidos pendentes enquanto o painel está aberto
  useEffect(() => {
    if (!carregado) return
    const atuais = new Set(vendas.filter((v) => v.status === "pendente").map((v) => v.id))
    if (pendentesConhecidos.current === null) {
      pendentesConhecidos.current = atuais
      return
    }
    for (const v of vendas) {
      if (atuais.has(v.id) && !pendentesConhecidos.current.has(v.id)) {
        toast.info("Novo pedido pendente", {
          description: `${v.nomeCliente} · ${v.servico} ${v.pacote}`,
          action: { label: "Ver", onClick: () => ir("vendas", "pendente") },
        })
        void notificar("Novo pedido", `${v.nomeCliente} pediu ${v.servico} (${v.pacote}).`, "/#/vendas", `pendente-${v.id}`)
      }
    }
    pendentesConhecidos.current = atuais
  }, [carregado, vendas, ir])

  // ao longo do dia (verifica a cada minuto): quem passou a terminar hoje
  useEffect(() => {
    if (!carregado || !resumoFeito.current) return
    for (const v of vendas) {
      if (estadoDe(v, agora) !== "a-expirar" || diasRestantes(v, agora) !== 0) continue
      if (terminamHojeAvisados.current.has(v.id)) continue
      terminamHojeAvisados.current.add(v.id)
      toast.warning(`${v.nomeCliente} termina hoje`, {
        description: `${v.servico} · ${v.perfil}`,
        action: { label: "Ver", onClick: () => ir("vendas", "a-expirar") },
      })
      void notificar(`${v.nomeCliente} termina hoje`, `${v.servico} · perfil ${v.perfil}`, "/#/vendas", `hoje-${v.id}`)
    }
  }, [carregado, vendas, agora, ir])
}
