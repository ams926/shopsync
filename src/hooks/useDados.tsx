import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { collection, doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { normalizarVenda } from "@/lib/vendas"
import type { ContasMaster, Venda } from "@/lib/types"

interface DadosCtx {
  vendas: Venda[]
  contas: ContasMaster
  servicos: string[]
  carregado: boolean
  erro: string | null
  /** "agora", atualizado a cada minuto para os estados mudarem sozinhos */
  agora: Date
}

const Ctx = createContext<DadosCtx | null>(null)

/** Ordem preferida dos serviços; os restantes aparecem a seguir, por ordem alfabética. */
const ORDEM = ["Netflix", "Prime Video"]

export function DadosProvider({ children }: { children: ReactNode }) {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [contas, setContas] = useState<ContasMaster>({})
  const [prontoV, setProntoV] = useState(false)
  const [prontoC, setProntoC] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const falha = (e: Error) => {
      console.error(e)
      setErro("Não foi possível ler a base de dados. Verifique a ligação ou as regras do Firestore.")
    }
    const offV = onSnapshot(
      collection(db, "vendas"),
      (snap) => {
        setVendas(snap.docs.map((d) => normalizarVenda(d.id, d.data())))
        setProntoV(true)
      },
      falha,
    )
    const offC = onSnapshot(
      doc(db, "configuracoes", "contasMaster"),
      (snap) => {
        setContas((snap.data() as ContasMaster | undefined) ?? {})
        setProntoC(true)
      },
      falha,
    )
    return () => {
      offV()
      offC()
    }
  }, [])

  const servicos = useMemo(() => {
    const nomes = Object.keys(contas)
    return nomes.sort((a, b) => {
      const ia = ORDEM.indexOf(a)
      const ib = ORDEM.indexOf(b)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      return a.localeCompare(b)
    })
  }, [contas])

  return (
    <Ctx.Provider value={{ vendas, contas, servicos, carregado: prontoV && prontoC, erro, agora }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDados() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useDados fora do DadosProvider")
  return c
}
