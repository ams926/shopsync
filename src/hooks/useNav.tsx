import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export type Pagina = "painel" | "vender" | "vendas" | "clientes" | "relatorios" | "contas"
const PAGINAS: Pagina[] = ["painel", "vender", "vendas", "clientes", "relatorios", "contas"]

interface NavCtx {
  pagina: Pagina
  ir: (p: Pagina, filtro?: string) => void
  /** filtro inicial opcional para a lista de vendas (ex.: "a-expirar") */
  filtro?: string
}

const Ctx = createContext<NavCtx | null>(null)

const lerHash = (): Pagina => {
  const h = window.location.hash.replace("#/", "").replace("#", "") as Pagina
  return PAGINAS.includes(h) ? h : "painel"
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [pagina, setPagina] = useState<Pagina>(lerHash)
  const [filtro, setFiltro] = useState<string | undefined>()

  useEffect(() => {
    const f = () => setPagina(lerHash())
    window.addEventListener("hashchange", f)
    return () => window.removeEventListener("hashchange", f)
  }, [])

  const ir = useCallback((p: Pagina, novoFiltro?: string) => {
    setFiltro(novoFiltro)
    if (lerHash() !== p) window.location.hash = `/${p}`
    setPagina(p)
    window.scrollTo({ top: 0 })
  }, [])

  return <Ctx.Provider value={{ pagina, ir, filtro }}>{children}</Ctx.Provider>
}

export function useNav() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useNav fora do NavProvider")
  return c
}
