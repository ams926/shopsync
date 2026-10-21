import { useEffect } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Shell } from "@/components/shell"
import { MarcaSS } from "@/components/marca"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { DadosProvider, useDados } from "@/hooks/useDados"
import { AcoesProvider } from "@/hooks/useAcoes"
import { NavProvider, useNav } from "@/hooks/useNav"
import { prepararRecibos } from "@/lib/recibo"
import { Login } from "@/pages/login"
import { Painel } from "@/pages/painel"
import { Vendas } from "@/pages/vendas"
import { Vender } from "@/pages/vender"
import { Clientes } from "@/pages/clientes"
import { Contas } from "@/pages/contas"
import { Relatorios } from "@/pages/relatorios"

function Paginas() {
  const { pagina } = useNav()
  const { carregado, erro } = useDados()

  if (erro) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border-2 border-ink bg-paper-2 p-6 text-center stamp-shadow">
        <AlertTriangleIcon className="mx-auto size-8 text-coral-ink" />
        <p className="mt-3 font-extrabold">{erro}</p>
      </div>
    )
  }
  if (!carregado) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  switch (pagina) {
    case "vender":
      return <Vender />
    case "vendas":
      return <Vendas />
    case "clientes":
      return <Clientes />
    case "relatorios":
      return <Relatorios />
    case "contas":
      return <Contas />
    default:
      return <Painel />
  }
}

function Portao() {
  const { estado } = useAuth()

  if (estado.tipo === "a-verificar") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <MarcaSS className="size-14 animate-pulse" />
      </div>
    )
  }
  if (estado.tipo === "fora") return <Login />

  // os dados só começam a ser lidos depois de entrar com a conta certa
  return (
    <DadosProvider>
      <NavProvider>
        <AcoesProvider>
          <Shell>
            <Paginas />
          </Shell>
        </AcoesProvider>
      </NavProvider>
    </DadosProvider>
  )
}

export default function App() {
  useEffect(() => {
    void prepararRecibos()
  }, [])

  return (
    <AuthProvider>
      <Portao />
      <Toaster />
    </AuthProvider>
  )
}
