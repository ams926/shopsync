import type { ReactNode } from "react"
import { ChartColumnIcon, KeyRoundIcon, LayoutGridIcon, LogOutIcon, PlusIcon, ReceiptTextIcon, UsersIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/marca"
import { NotificacoesBotao } from "@/components/notificacoes-botao"
import { useAlertas } from "@/hooks/useAlertas"
import { useAuth } from "@/hooks/useAuth"
import { useNav, type Pagina } from "@/hooks/useNav"
import { cn } from "@/lib/utils"

const ITENS: { id: Pagina; nome: string; icone: typeof LayoutGridIcon }[] = [
  { id: "painel", nome: "Painel", icone: LayoutGridIcon },
  { id: "vendas", nome: "Vendas", icone: ReceiptTextIcon },
  { id: "vender", nome: "Vender", icone: PlusIcon },
  { id: "clientes", nome: "Clientes", icone: UsersIcon },
  { id: "relatorios", nome: "Relatórios", icone: ChartColumnIcon },
  { id: "contas", nome: "Contas", icone: KeyRoundIcon },
]

function Avatar() {
  const { estado, sair } = useAuth()
  const { ir } = useNav()
  if (estado.tipo !== "dentro") return null
  const u = estado.user
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1 text-left outline-none hover:bg-ink/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {u.photoURL ? (
          <img src={u.photoURL} alt="" className="size-8 rounded-full border-[1.5px] border-ink" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full border-[1.5px] border-ink bg-sol text-xs font-bold">
            {(u.displayName ?? u.email ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-sm font-bold">{u.displayName ?? "Administrador"}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuLabel>{u.email}</DropdownMenuLabel>
        <DropdownMenuItem className="lg:hidden" onSelect={() => ir("contas")}>
          <KeyRoundIcon /> Contas e preços
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void sair()}>
          <LogOutIcon /> Terminar sessão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { pagina, ir } = useNav()
  useAlertas()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* computador */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r-[1.5px] border-ink/15 px-4 py-6 lg:flex">
        <button onClick={() => ir("painel")} className="mb-9 px-2 text-left">
          <Logo className="h-9" />
          <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            gestão
          </span>
        </button>
        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map((it) => {
            const ativo = pagina === it.id
            const vender = it.id === "vender"
            return (
              <button
                key={it.id}
                onClick={() => ir(it.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-all",
                  vender && "my-2 border-2 border-ink bg-coral stamp-shadow-sm hover:brightness-105",
                  !vender && (ativo ? "bg-ink text-primary-foreground" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink"),
                  vender && ativo && "translate-x-[1px] translate-y-[1px] shadow-none",
                )}
              >
                <it.icone className="size-[18px]" strokeWidth={2.2} />
                {vender ? "Nova venda" : it.nome}
              </button>
            )
          })}
        </nav>
        <NotificacoesBotao comTexto className="mb-2" />
        <Avatar />
      </aside>

      {/* telemóvel: topo */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-[1.5px] border-ink/10 bg-paper/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button onClick={() => ir("painel")}>
          <Logo className="h-7" />
        </button>
        <div className="flex items-center gap-1">
          <NotificacoesBotao />
          <Avatar />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>

      {/* telemóvel: barra de baixo */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-ink/15 bg-paper-2/95 backdrop-blur safe-bottom lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
          {ITENS.filter((it) => it.id !== "contas").map((it) => {
            const ativo = pagina === it.id
            if (it.id === "vender") {
              return (
                <button key={it.id} onClick={() => ir(it.id)} className="flex flex-col items-center gap-0.5" aria-label="Nova venda">
                  <span
                    className={cn(
                      "-mt-6 grid size-13 place-items-center rounded-full border-2 border-ink bg-coral stamp-shadow-sm",
                      ativo && "translate-x-[1px] translate-y-[1px] shadow-none",
                    )}
                  >
                    <PlusIcon className="size-6" strokeWidth={2.6} />
                  </span>
                  <span className="text-[10.5px] font-bold">Vender</span>
                </button>
              )
            }
            return (
              <button
                key={it.id}
                onClick={() => ir(it.id)}
                className={cn("flex flex-col items-center gap-1 py-1 text-[10.5px] font-bold", ativo ? "text-ink" : "text-ink/45")}
              >
                <span className={cn("grid h-7 w-11 place-items-center rounded-full", ativo && "bg-sol")}>
                  <it.icone className="size-[19px]" strokeWidth={2.2} />
                </span>
                {it.nome}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/** Cabeçalho de página: título grande com uma etiqueta recortada por cima. */
export function Cabecalho({
  etiqueta,
  titulo,
  children,
}: {
  etiqueta?: string
  titulo: string
  children?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {etiqueta && <span className="cutout mb-2 -rotate-1 text-[11px] uppercase tracking-[0.14em]">{etiqueta}</span>}
        <h1 className="text-[34px] leading-[0.95] font-extrabold sm:text-[44px]">{titulo}</h1>
      </div>
      {children}
    </div>
  )
}
