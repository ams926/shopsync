import {
  BellRingIcon,
  CheckIcon,
  DownloadIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Carimbo, EtiquetaServico, corServico } from "@/components/marca"
import { useAcoes } from "@/hooks/useAcoes"
import { useDados } from "@/hooks/useDados"
import { dataHora, mt, quando } from "@/lib/format"
import { cn } from "@/lib/utils"
import { diasRestantes, estadoDe } from "@/lib/vendas"
import type { Venda } from "@/lib/types"

export function VendaCard({ venda }: { venda: Venda }) {
  const { agora } = useDados()
  const a = useAcoes()
  const estado = estadoDe(venda, agora)
  const dias = diasRestantes(venda, agora)
  const cor = corServico(venda.servico)
  const apagada = estado === "renovado"

  // a ação principal muda conforme o estado: é o botão que se usa mais vezes
  const principal =
    estado === "pendente" ? (
      <Button size="sm" variant="coral" onClick={() => a.aprovar(venda)}>
        <CheckIcon /> Aprovar
      </Button>
    ) : estado === "expirado" || estado === "a-expirar" ? (
      <Button size="sm" variant="coral" onClick={() => a.renovar(venda)}>
        <RefreshCwIcon /> Renovar
      </Button>
    ) : estado === "ativo" ? (
      <Button size="sm" variant="outline" onClick={() => a.enviarDados(venda)}>
        <MessageCircleIcon /> Dados
      </Button>
    ) : null

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-xl border-[1.5px] border-ink/80 bg-paper-2 transition-shadow hover:stamp-shadow-sm",
        apagada && "border-ink/25 opacity-60",
      )}
    >
      <div className={cn("w-1.5 shrink-0", cor.barra)} />
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 p-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-extrabold leading-tight">{venda.nomeCliente}</h3>
            <Carimbo estado={estado} className="hidden sm:inline-flex" />
          </div>
          <p className="num mt-0.5 truncate text-xs text-ink-soft">{venda.telefone || "sem telefone"}</p>
        </div>

        <div className="text-right sm:hidden">
          <Carimbo estado={estado} />
        </div>

        <div className="min-w-0 text-[13px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <EtiquetaServico servico={venda.servico} />
            <span className="truncate font-semibold">{venda.perfil || "sem perfil"}</span>
          </div>
          <p className="num mt-1 truncate text-xs text-ink-soft">
            {venda.pacote} ·{" "}
            {estado === "pendente" ? (
              "a aguardar"
            ) : (
              <>
                {dataHora(venda.dataExpiracao)}{" "}
                <span className={cn(estado === "a-expirar" && "rounded bg-sol px-1 text-ink", estado === "expirado" && "text-coral-ink")}>
                  ({quando(dias, estado === "expirado", venda.dataExpiracao)})
                </span>
              </>
            )}
          </p>
        </div>

        <span className="num hidden text-right text-sm font-semibold sm:block">{mt(venda.precoMZN)}</span>

        <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
          <span className="num text-sm font-semibold sm:hidden">{mt(venda.precoMZN)}</span>
          <div className="flex items-center gap-1.5">
            {principal}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Mais ações" className="size-8">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{venda.nomeCliente}</DropdownMenuLabel>
                {estado !== "pendente" && estado !== "renovado" && (
                  <DropdownMenuItem onSelect={() => a.renovar(venda)}>
                    <RefreshCwIcon /> Renovar
                  </DropdownMenuItem>
                )}
                {estado === "pendente" && (
                  <DropdownMenuItem onSelect={() => a.aprovar(venda)}>
                    <CheckIcon /> Aprovar pedido
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => a.enviarDados(venda)}>
                  <MessageCircleIcon /> Enviar dados (WhatsApp)
                </DropdownMenuItem>
                {(estado === "a-expirar" || estado === "expirado") && (
                  <DropdownMenuItem onSelect={() => a.cobrar(venda)}>
                    <BellRingIcon /> Lembrar / cobrar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void a.partilhar(venda)}>
                  <Share2Icon /> Partilhar recibo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void a.baixar(venda)}>
                  <DownloadIcon /> Baixar recibo PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => a.editar(venda)}>
                  <PencilIcon /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => a.apagar(venda)}>
                  <Trash2Icon /> Apagar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  )
}
