import { useMemo, useState, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ComposedChart, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRightIcon, ArrowUpRightIcon, FileSpreadsheetIcon, Loader2Icon, RepeatIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CartaoGrafico, COR_GRAFICO, ConteudoTooltip, compacto, corDoServico, eixo, eixoMeses, escala } from "@/components/ui/chart"
import { Cabecalho } from "@/components/shell"
import { IconeServico } from "@/components/marca"
import { useDados } from "@/hooks/useDados"
import { useNav } from "@/hooks/useNav"
import { data, mt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { exportarExcel } from "@/lib/excel"
import { LIMITE_POR_PERFIL } from "@/lib/vendas"
import {
  PERIODOS,
  aRenovar,
  intervaloDe,
  mensalPorServico,
  novosVsRecorrentes,
  ocupacaoPerfis,
  pacotesVendidos,
  resumo,
  ritmoDoMes,
  temCustos,
  topClientes,
  type Periodo,
} from "@/lib/relatorios"

const pct = (x: number) => `${Math.round(x * 100)}%`

export function Relatorios() {
  const { vendas, contas, servicos, agora } = useDados()
  const { ir } = useNav()
  const [periodo, setPeriodo] = useState<Periodo>("mes")
  const [aExportar, setAExportar] = useState(false)

  const comCustos = temCustos(contas)
  // os serviços que aparecem nas vendas mas já não existem em Contas juntam-se em "Outros"
  const series = useMemo(() => {
    const extra = vendas.some((v) => !servicos.includes(v.servico))
    return extra ? [...servicos, "Outros"] : servicos
  }, [vendas, servicos])

  const d = useMemo(() => {
    const i = intervaloDe(periodo, agora)
    // os gráficos por mês mostram pelo menos 6 meses, para haver com que comparar
    const iMeses = periodo === "mes" ? intervaloDe("3m", agora) : i
    const iMeses6 = periodo === "mes" ? { ...iMeses, meses: Array.from({ length: 6 }, (_, k) => new Date(agora.getFullYear(), agora.getMonth() - 5 + k, 1)) } : iMeses
    return {
      i,
      r: resumo(vendas, contas, periodo, agora),
      mensal: mensalPorServico(vendas, contas, series, agora, 12),
      ritmo: ritmoDoMes(vendas, agora),
      pacotes: pacotesVendidos(vendas, series, i),
      perfis: ocupacaoPerfis(vendas, contas, servicos, agora),
      novos: novosVsRecorrentes(vendas, iMeses6),
      r7: aRenovar(vendas, agora, 7),
      r30: aRenovar(vendas, agora, 30),
      top: topClientes(vendas, i, 10),
    }
  }, [vendas, contas, periodo, agora, series, servicos])

  const nomePeriodo = periodo === "mes" ? agora.toLocaleDateString("pt-PT", { month: "long" }) : PERIODOS.find((p) => p.id === periodo)!.nome.toLowerCase()
  const variacao = d.r.receitaAnterior > 0 ? (d.r.receita - d.r.receitaAnterior) / d.r.receitaAnterior : null
  const mesAtual = agora.toLocaleDateString("pt-PT", { month: "long" })
  const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1).toLocaleDateString("pt-PT", { month: "long" })
  const maxTop = Math.max(1, ...d.top.map((c) => c.total))
  const escalaReceita = escala(d.mensal.flatMap((m) => [m.total, m.lucro]))
  const escalaRitmo = escala(d.ritmo.flatMap((r) => [r.atual, r.anterior]))

  const exportar = async () => {
    setAExportar(true)
    try {
      await exportarExcel(vendas, contas, servicos, agora)
      toast.success("Excel descarregado")
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível criar o Excel")
    } finally {
      setAExportar(false)
    }
  }

  return (
    <>
      <Cabecalho etiqueta="números" titulo="Relatórios">
        <Button variant="outline" onClick={() => void exportar()} disabled={aExportar}>
          {aExportar ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />}
          Exportar Excel
        </Button>
      </Cabecalho>

      {/* período: uma só linha de filtros, acima de tudo */}
      <div className="mb-6 inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={periodo === p.id}
            onClick={() => setPeriodo(p.id)}
            className={cn(
              "h-9 rounded-md px-4 text-sm font-bold transition-colors",
              periodo === p.id ? "bg-paper-2 text-ink shadow-[0_0_0_1.5px_var(--ink)]" : "text-ink-soft hover:text-ink",
            )}
          >
            {p.nome}
          </button>
        ))}
      </div>

      {/* números principais */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile rotulo={`Receita · ${nomePeriodo}`} valor={mt(d.r.receita)} destaque>
          {variacao === null ? (
            "sem período anterior para comparar"
          ) : (
            <span className="inline-flex items-center gap-1">
              {variacao >= 0 ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
              {variacao >= 0 ? "+" : ""}
              {pct(variacao)} vs. período anterior
            </span>
          )}
        </Tile>
        <Tile rotulo="Lucro" valor={comCustos ? mt(d.r.lucro) : "—"} negativo={comCustos && d.r.lucro < 0}>
          {comCustos ? (
            `custos das contas: ${mt(d.r.custos)}`
          ) : (
            <button className="font-semibold text-azul-ink underline underline-offset-2" onClick={() => ir("contas")}>
              indique o custo das contas
            </button>
          )}
        </Tile>
        <Tile rotulo="Vendas" valor={String(d.r.nVendas)}>
          valor médio {mt(Math.round(d.r.ticketMedio))}
        </Tile>
        <Tile rotulo="Taxa de renovação" valor={d.r.taxaRenovacao === null ? "—" : pct(d.r.taxaRenovacao)}>
          {d.r.terminadas
            ? `${d.r.renovadas} de ${d.r.terminadas} que terminaram renovaram`
            : "ainda nenhuma terminou neste período"}
        </Tile>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* receita por serviço */}
        <CartaoGrafico
          className="lg:col-span-2"
          titulo="Receita por serviço"
          subtitulo={comCustos ? "Últimos 12 meses · a linha mostra o lucro (receita menos o custo das contas)" : "Últimos 12 meses"}
          legenda={[
            ...series.map((s) => ({ nome: s, cor: corDoServico(s, series) })),
            ...(comCustos ? [{ nome: "Lucro", cor: COR_GRAFICO.tinta, tipo: "linha" as const }] : []),
          ]}
          altura={280}
          vazio={d.mensal.every((m) => m.total === 0) ? "Ainda sem vendas nos últimos 12 meses." : undefined}
          tabela={{
            colunas: ["Mês", ...series, "Total", ...(comCustos ? ["Lucro"] : [])],
            linhas: d.mensal.map((m) => [m.mes, ...series.map((s) => Number(m[s]) || 0), m.total, ...(comCustos ? [m.lucro ?? 0] : [])]),
          }}
        >
          <ComposedChart data={d.mensal} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={COR_GRAFICO.grelha} />
            <XAxis dataKey="mes" {...eixoMeses} />
            <YAxis {...eixo} {...escalaReceita} tickFormatter={compacto} width={44} />
            <Tooltip cursor={{ fill: "rgba(29,26,22,.05)" }} content={<ConteudoTooltip total />} />
            {series.map((s, k) => (
              <Bar
isAnimationActive={false}                 key={s}
                dataKey={s}
                name={s}
                stackId="r"
                fill={corDoServico(s, series)}
                stroke={COR_GRAFICO.fundo}
                strokeWidth={2}
                maxBarSize={24}
                radius={k === series.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
            {comCustos && (
              <Line isAnimationActive={false} dataKey="lucro" name="Lucro" stroke={COR_GRAFICO.tinta} strokeWidth={2} dot={{ r: 4, fill: COR_GRAFICO.tinta, stroke: COR_GRAFICO.fundo, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            )}
          </ComposedChart>
        </CartaoGrafico>

        {/* ritmo do mês */}
        <CartaoGrafico
          titulo={`Ritmo de ${mesAtual}`}
          subtitulo={`Receita acumulada dia a dia, comparada com ${mesAnterior}`}
          legenda={[
            { nome: mesAtual, cor: COR_GRAFICO.tinta, tipo: "linha" },
            { nome: mesAnterior, cor: COR_GRAFICO.apagado, tipo: "linha" },
          ]}
          tabela={{
            colunas: ["Dia", mesAtual, mesAnterior],
            linhas: d.ritmo.map((r) => [r.dia, r.atual ?? "—", r.anterior ?? "—"]),
          }}
        >
          <LineChart data={d.ritmo} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={COR_GRAFICO.grelha} />
            <XAxis dataKey="dia" {...eixo} ticks={[1, 8, 15, 22, 29]} />
            <YAxis {...eixo} {...escalaRitmo} tickFormatter={compacto} width={44} />
            <Tooltip
              cursor={{ stroke: COR_GRAFICO.eixo, strokeWidth: 1 }}
              content={<ConteudoTooltip titulo={(l) => `Até ao dia ${l}`} />}
            />
            <Line isAnimationActive={false} dataKey="anterior" name={mesAnterior} stroke={COR_GRAFICO.apagado} strokeWidth={2} dot={false} connectNulls={false} />
            <Line
isAnimationActive={false}               dataKey="atual"
              name={mesAtual}
              stroke={COR_GRAFICO.tinta}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: COR_GRAFICO.fundo, strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </CartaoGrafico>

        {/* renovações */}
        <section className="grid gap-4 rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4 sm:p-5">
          <header>
            <h2 className="text-lg leading-tight font-extrabold">Dinheiro a renovar</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Subscrições ativas que terminam em breve. É a receita que pode garantir já.</p>
          </header>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Próximos 7 dias", d.r7],
                ["Próximos 30 dias", d.r30],
              ] as const
            ).map(([t, x]) => (
              <button
                key={t}
                onClick={() => ir("vendas", t.includes("7") ? "a-expirar" : "ativo")}
                className="rounded-lg bg-muted p-3 text-left transition-shadow hover:shadow-[0_0_0_1.5px_var(--ink)]"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t}</p>
                <p className="mt-1.5 text-[26px] leading-none font-bold">{mt(x.valor)}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {x.n} {x.n === 1 ? "subscrição" : "subscrições"}
                </p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-dashed border-ink/20 p-3">
            <RepeatIcon className="size-5 shrink-0 text-ink-soft" />
            <p className="text-sm">
              {d.r.taxaRenovacao === null ? (
                "A taxa de renovação aparece quando houver subscrições terminadas no período."
              ) : (
                <>
                  <b>{pct(d.r.taxaRenovacao)}</b> dos clientes cujo acesso terminou em {nomePeriodo} voltaram a comprar.
                </>
              )}
            </p>
          </div>
        </section>

        <CartaoGrafico
          titulo="Clientes novos e clientes que voltam"
          subtitulo="Número de vendas por mês"
          legenda={[
            { nome: "Clientes que voltam", cor: COR_GRAFICO.c3 },
            { nome: "Clientes novos", cor: COR_GRAFICO.c4 },
          ]}
          vazio={d.novos.every((n) => n.novos + n.recorrentes === 0) ? "Sem vendas neste período." : undefined}
          tabela={{ colunas: ["Mês", "Voltam", "Novos"], linhas: d.novos.map((n) => [n.mes, n.recorrentes, n.novos]) }}
        >
          <BarChart data={d.novos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={COR_GRAFICO.grelha} />
            <XAxis dataKey="mes" {...eixoMeses} />
            <YAxis {...eixo} {...escala(d.novos.map((n) => n.novos + n.recorrentes))} width={32} />
            <Tooltip cursor={{ fill: "rgba(29,26,22,.05)" }} content={<ConteudoTooltip formatar={(n) => `${n} vendas`} total />} />
            <Bar isAnimationActive={false} dataKey="recorrentes" name="Clientes que voltam" stackId="n" fill={COR_GRAFICO.c3} stroke={COR_GRAFICO.fundo} strokeWidth={2} maxBarSize={24} />
            <Bar isAnimationActive={false} dataKey="novos" name="Clientes novos" stackId="n" fill={COR_GRAFICO.c4} stroke={COR_GRAFICO.fundo} strokeWidth={2} maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </CartaoGrafico>

        {/* pacotes */}
        <CartaoGrafico
          titulo="Pacotes vendidos"
          subtitulo={`Quantas vezes cada pacote foi vendido · ${nomePeriodo}`}
          legenda={series.map((s) => ({ nome: s, cor: corDoServico(s, series) }))}
          altura={Math.max(160, d.pacotes.length * 44 + 30)}
          vazio={d.pacotes.length === 0 ? "Sem vendas neste período." : undefined}
          tabela={{ colunas: ["Pacote", ...series, "Total"], linhas: d.pacotes.map((p) => [p.pacote, ...series.map((s) => Number((p as Record<string, unknown>)[s]) || 0), p.total]) }}
        >
          <BarChart data={d.pacotes} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke={COR_GRAFICO.grelha} />
            <XAxis type="number" {...eixo} allowDecimals={false} />
            <YAxis type="category" dataKey="pacote" {...eixo} width={62} tick={{ ...eixo.tick, fontFamily: "inherit", fontWeight: 600, fill: COR_GRAFICO.tinta }} />
            <Tooltip cursor={{ fill: "rgba(29,26,22,.05)" }} content={<ConteudoTooltip formatar={(n) => `${n}×`} total />} />
            {series.map((s, k) => (
              <Bar
isAnimationActive={false}                 key={s}
                dataKey={s}
                name={s}
                stackId="p"
                fill={corDoServico(s, series)}
                stroke={COR_GRAFICO.fundo}
                strokeWidth={2}
                maxBarSize={22}
                radius={k === series.length - 1 ? [0, 4, 4, 0] : 0}
              />
            ))}
          </BarChart>
        </CartaoGrafico>

        {/* perfis */}
        <section className="rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4 sm:p-5">
          <header className="mb-4">
            <h2 className="text-lg leading-tight font-extrabold">Ocupação dos perfis</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Clientes ativos agora, em cada perfil (máximo {LIMITE_POR_PERFIL})
            </p>
          </header>
          <div className="space-y-5">
            {d.perfis.map((s) => {
              const cor = corDoServico(s.servico, series)
              const usadas = s.perfis.reduce((t, p) => t + Math.min(p.usadas, LIMITE_POR_PERFIL), 0)
              const total = s.perfis.length * LIMITE_POR_PERFIL
              return (
                <div key={s.servico}>
                  <div className="mb-2 flex items-center gap-2">
                    <IconeServico servico={s.servico} className="size-7" />
                    <span className="flex-1 text-sm font-extrabold">{s.servico}</span>
                    <span className="num text-xs text-ink-soft">
                      {total ? pct(usadas / total) : "—"} ocupado
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {s.perfis.map((p) => (
                      <li key={p.nome} className="grid grid-cols-[92px_minmax(0,1fr)_34px] items-center gap-3">
                        <span className="truncate text-[13px] font-semibold">{p.nome}</span>
                        <span className="h-2.5 overflow-hidden rounded-full" style={{ background: `${cor}26` }}>
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(Math.min(p.usadas, LIMITE_POR_PERFIL) / LIMITE_POR_PERFIL) * 100}%`, background: cor }}
                          />
                        </span>
                        <span className="num text-right text-xs text-ink-soft">
                          {p.usadas}/{LIMITE_POR_PERFIL}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* melhores clientes */}
        <section className="rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4 sm:p-5">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg leading-tight font-extrabold">Melhores clientes</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Quem mais gastou · {nomePeriodo}</p>
            </div>
            <WalletIcon className="size-5 text-ink-soft" />
          </header>
          {d.top.length === 0 ? (
            <p className="rounded-lg border-[1.5px] border-dashed border-ink/15 p-8 text-center text-sm text-muted-foreground">
              Sem vendas neste período.
            </p>
          ) : (
            <ol className="grid gap-y-3">
              {d.top.map((c, k) => (
                <li key={c.chave} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3">
                  <span className={cn("num text-sm font-semibold", k < 3 ? "text-ink" : "text-muted-foreground")}>{k + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate text-sm font-bold">{c.nome}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.compras} {c.compras === 1 ? "compra" : "compras"} · cliente desde {data(c.desde)}
                      </span>
                    </div>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                      <span className="block h-full rounded-full bg-ink" style={{ width: `${(c.total / maxTop) * 100}%` }} />
                    </span>
                  </div>
                  <span className="num w-[84px] text-right text-sm font-semibold">{mt(c.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

function Tile({
  rotulo,
  valor,
  children,
  destaque = false,
  negativo = false,
}: {
  rotulo: string
  valor: string
  children?: ReactNode
  destaque?: boolean
  negativo?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4",
        destaque && "border-2 border-ink bg-sol stamp-shadow",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft first-letter:uppercase">{rotulo}</p>
      <p className={cn("mt-2 text-[26px] leading-none font-bold sm:text-[30px]", negativo && "text-coral-ink")}>{valor}</p>
      <div className="mt-2 text-xs text-ink-soft">{children}</div>
    </div>
  )
}
