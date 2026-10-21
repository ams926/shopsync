import { useState } from "react"
import { toast } from "sonner"
import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  definirAtivas,
  notificacoesAtivas,
  notificar,
  pedirPermissao,
  permissao,
  suportaNotificacoes,
} from "@/lib/notificacoes"
import { ativarPush, desativarPush, pushConfigurado } from "@/lib/push"

export function NotificacoesBotao({ comTexto = false, className }: { comTexto?: boolean; className?: string }) {
  const [ativas, setAtivas] = useState(notificacoesAtivas)

  if (!suportaNotificacoes()) return null

  const alternar = async () => {
    if (ativas) {
      definirAtivas(false)
      setAtivas(false)
      void desativarPush()
      toast("Notificações desligadas", { description: "Os avisos continuam a aparecer dentro do painel." })
      return
    }
    if (permissao() === "denied") {
      toast.error("Notificações bloqueadas", {
        description: "Permita as notificações para este site nas definições do navegador (ícone do cadeado ao lado do endereço).",
        duration: 8000,
      })
      return
    }
    const ok = await pedirPermissao()
    setAtivas(ok)
    if (ok) {
      const push = pushConfigurado() ? await ativarPush() : false
      toast.success("Notificações ativas", {
        description: push
          ? "Vai recebê-las neste aparelho mesmo com o painel fechado."
          : "Vai recebê-las enquanto o painel estiver aberto.",
      })
      void notificar("ShopSync", "Vai receber aqui os avisos de renovações e de novos pedidos.", "/#/painel", "teste")
    }
  }

  const Icone = ativas ? BellRingIcon : permissao() === "denied" ? BellOffIcon : BellIcon
  const texto = ativas ? "Notificações ativas" : "Ativar notificações"

  return (
    <Button
      variant="ghost"
      size={comTexto ? "default" : "icon"}
      onClick={() => void alternar()}
      aria-label={texto}
      title={texto}
      className={cn(comTexto && "w-full justify-start px-3 text-[14px] font-semibold text-ink-soft", className)}
    >
      <Icone className={cn(ativas && "text-coral-ink")} />
      {comTexto && texto}
    </Button>
  )
}
