import { useState, type ReactElement, type ReactNode } from "react"
import { BarChart3Icon, TableIcon } from "lucide-react"
import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

/*
  Peças comuns dos gráficos (inspirado no componente "chart" do shadcn/ui).
  Paleta validada para daltonismo sobre o fundo #FBF7EF:
  coral (Netflix) · azul (Prime Video) · dourado · violeta, nesta ordem fixa.
*/
export const COR_GRAFICO = {
  c1: "#E5432F",
  c2: "#2369E8",
  c3: "#B88300",
  c4: "#8B5FD1",
  outros: "#9A9285",
  tinta: "#1D1A16",
  apagado: "#C9BFAE",
  grelha: "#E8E0D1",
  eixo: "#7A7268",
  fundo: "#FBF7EF",
} as const

/** A cor segue o serviço, nunca a posição: a Netflix é sempre coral, mesmo com filtros. */
export function corDoServico(servico: string, todos: string[]): string {
  if (/netflix/i.test(servico)) return COR_GRAFICO.c1
  if (/prime/i.test(servico)) return COR_GRAFICO.c2
  if (servico === "Outros") return COR_GRAFICO.outros
  const restantes = todos.filter((s) => !/netflix|prime/i.test(s) && s !== "Outros")
  const i = restantes.indexOf(servico)
  return [COR_GRAFICO.c3, COR_GRAFICO.c4][i] ?? COR_GRAFICO.outros
}

export const eixo = {
  tick: { fill: COR_GRAFICO.eixo, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" },
  axisLine: false,
  tickLine: false,
} as const

/** Eixo dos meses: no telemóvel salta etiquetas para não se sobreporem. */
export const eixoMeses = { ...eixo, interval: "preserveStartEnd" as const, minTickGap: 6 }

/** Escala com valores redondos (0, 1k, 2k, 3k…) a partir dos dados. */
export function escala(valores: (number | null | undefined)[], passos = 4) {
  const nums = valores.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  const max = Math.max(0, ...nums)
  const min = Math.min(0, ...nums)
  const bruto = Math.max(1, (max - min) / passos)
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? 10 * mag
  const ini = Math.floor(min / passo) * passo
  const fim = Math.ceil(max / passo) * passo || passo
  const ticks: number[] = []
  for (let t = ini; t <= fim + passo / 2; t += passo) ticks.push(Math.round(t))
  return { domain: [ini, fim] as [number, number], ticks }
}

export function compacto(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}M`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}k`
  return String(n)
}

export function CartaoGrafico({
  titulo,
  subtitulo,
  legenda,
  acao,
  children,
  className,
  altura = 240,
  vazio,
  tabela,
}: {
  titulo: string
  subtitulo?: string
  legenda?: { nome: string; cor: string; tipo?: "barra" | "linha" }[]
  acao?: ReactNode
  children: ReactNode
  className?: string
  altura?: number
  /** mensagem a mostrar quando não há dados */
  vazio?: string
  /** os mesmos números em tabela, para quem prefere ler valores (e para acessibilidade) */
  tabela?: { colunas: string[]; linhas: (string | number)[][] }
}) {
  const [verTabela, setVerTabela] = useState(false)
  return (
    <section className={cn("rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4 sm:p-5", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-lg leading-tight font-extrabold">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {acao}
          {tabela && !vazio && (
            <button
              type="button"
              onClick={() => setVerTabela((x) => !x)}
              className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-ink/20 px-2 py-1 text-[12px] font-semibold text-ink-soft hover:border-ink/50 hover:text-ink"
              aria-pressed={verTabela}
            >
              {verTabela ? <BarChart3Icon className="size-3.5" /> : <TableIcon className="size-3.5" />}
              {verTabela ? "Gráfico" : "Tabela"}
            </button>
          )}
        </div>
      </header>
      {legenda && legenda.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legenda">
          {legenda.map((l) => (
            <li key={l.nome} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
              {l.tipo === "linha" ? (
                <span className="h-[2px] w-3.5 rounded-full" style={{ background: l.cor }} />
              ) : (
                <span className="size-2.5 rounded-[3px]" style={{ background: l.cor }} />
              )}
              {l.nome}
            </li>
          ))}
        </ul>
      )}
      {tabela && verTabela && !vazio ? (
        <div className="max-h-[320px] overflow-auto rounded-lg border-[1.5px] border-ink/15">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {tabela.colunas.map((c, i) => (
                  <th key={c} className={cn("px-3 py-2 text-left font-bold", i > 0 && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((l, k) => (
                <tr key={k} className="border-t border-ink/10">
                  {l.map((c, i) => (
                    <td key={i} className={cn("px-3 py-1.5", i > 0 && "num text-right")}>
                      {typeof c === "number" ? c.toLocaleString("pt-PT") : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : vazio ? (
        <div
          className="grid place-items-center rounded-lg border-[1.5px] border-dashed border-ink/15 text-sm text-muted-foreground"
          style={{ height: altura }}
        >
          {vazio}
        </div>
      ) : (
        <div style={{ height: altura }} className="-ml-2 [&_.recharts-surface]:overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            {children as ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

type ItemTooltip = { name?: string | number; value?: number | string | null; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }

/** Caixa que aparece ao passar o rato / tocar num ponto do gráfico. */
export function ConteudoTooltip({
  active,
  payload,
  label,
  formatar = (n) => `${n.toLocaleString("pt-PT")} MT`,
  titulo,
  total,
}: {
  active?: boolean
  payload?: ItemTooltip[]
  label?: string | number
  formatar?: (n: number) => string
  titulo?: (label: string | number | undefined, p?: Record<string, unknown>) => string
  total?: boolean
}) {
  if (!active || !payload?.length) return null
  const itens = payload.filter((p) => p.value !== null && p.value !== undefined)
  const soma = itens.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div className="min-w-[150px] rounded-lg border-2 border-ink bg-popover px-3 py-2 text-[12px] shadow-[2px_2px_0_0_var(--ink)]">
      <p className="mb-1.5 font-bold">{titulo ? titulo(label, payload[0]?.payload) : label}</p>
      <ul className="space-y-1">
        {itens.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="num font-semibold">{formatar(Number(p.value) || 0)}</span>
          </li>
        ))}
      </ul>
      {total && itens.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-ink/15 pt-1.5 font-bold">
          <span>Total</span>
          <span className="num">{formatar(soma)}</span>
        </p>
      )}
    </div>
  )
}
