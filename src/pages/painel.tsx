import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { CartaoGrafico, COR_GRAFICO, ConteudoTooltip, compacto, corDoServico, eixo, escala } from "@/components/ui/chart"
import { custoMensalTotal, mensalPorServico, temCustos } from "@/lib/relatorios"
import { ArrowRightIcon, BellRingIcon, CheckCheckIcon, CheckIcon, MegaphoneIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Cabecalho } from "@/components/shell"
import { IconeServico } from "@/components/marca"
import { Vagas } from "@/components/vagas"
import { useAcoes } from "@/hooks/useAcoes"
import { useDados } from "@/hooks/useDados"
import { useNav } from "@/hooks/useNav"
import { mt, quando } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LIMITE_POR_PERFIL, diasRestantes, estadoDe, lembradoHoje, ocupacao } from "@/lib/vendas"
import type { Venda } from "@/lib/types"

const conta = (v: Venda) => v.status !== "pendente"

export function Painel() {
  const { vendas, contas, servicos, agora } = useDados()
  const { ir } = useNav()
  const a = useAcoes()

  const r = useMemo(() => {
    const mes = agora.getMonth()
    const ano = agora.getFullYear()
    const doMes = vendas.filter((v) => conta(v) && v.dataRegisto.getMonth() === mes && v.dataRegisto.getFullYear() === ano)
    const mesAnt = new Date(ano, mes - 1, 1)
    const doMesAnterior = vendas.filter(
      (v) => conta(v) && v.dataRegisto.getMonth() === mesAnt.getMonth() && v.dataRegisto.getFullYear() === mesAnt.getFullYear(),
    )
    const estados = vendas.map((v) => [v, estadoDe(v, agora)] as const)
    const ativos = estados.filter(([, e]) => e === "ativo" || e === "a-expirar").length
    const aExpirar = estados
      .filter(([, e]) => e === "a-expirar")
      .map(([v]) => v)
      .sort((x, y) => (x.dataExpiracao?.getTime() ?? 0) - (y.dataExpiracao?.getTime() ?? 0))
    const recentes = estados
      .filter(([v, e]) => e === "expirado" && (diasRestantes(v, agora) ?? -99) >= -10)
      .map(([v]) => v)
      .sort((x, y) => (y.dataExpiracao?.getTime() ?? 0) - (x.dataExpiracao?.getTime() ?? 0))
    const pendentes = estados.filter(([, e]) => e === "pendente").map(([v]) => v)

    return {
      receita: doMes.reduce((s, v) => s + v.precoMZN, 0),
      receitaAnterior: doMesAnterior.reduce((s, v) => s + v.precoMZN, 0),
      nVendas: doMes.length,
      ativos,
      aExpirar,
      recentes,
      pendentes,
    }
  }, [vendas, agora])

  const variacao = r.receitaAnterior > 0 ? Math.round(((r.receita - r.receitaAnterior) / r.receitaAnterior) * 100) : null
  const nomeMes = agora.toLocaleDateString("pt-PT", { month: "long" })
  const hoje = agora.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
  const seisMeses = useMemo(() => mensalPorServico(vendas, contas, servicos, agora, 6), [vendas, contas, servicos, agora])
  const comCustos = temCustos(contas)
  const lucro = r.receita - custoMensalTotal(contas)
  const aTratar = [...r.aExpirar, ...r.recentes]
  const porLembrar = aTratar.filter((v) => !lembradoHoje(v, agora)).length

  return (
    <>
      <Cabecalho etiqueta={hoje} titulo="Hoje" />

      {/* números do mês */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="tape col-span-3 rounded-xl border-2 border-ink bg-sol p-4 stamp-shadow lg:col-span-1 lg:-rotate-[0.6deg]">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]">Receita de {nomeMes}</p>
          <p className="num mt-2 text-[32px] leading-none font-semibold">{mt(r.receita)}</p>
          <p className="num mt-2 text-xs">
            {variacao === null ? "sem mês anterior para comparar" : `${variacao >= 0 ? "+" : ""}${variacao}% vs. mês passado`}
          </p>
          {comCustos && (
            <p className="mt-2.5 border-t-[1.5px] border-dashed border-ink/25 pt-2 text-xs">
              Lucro <b className="num text-[13px]">{mt(lucro)}</b>
            </p>
          )}
        </div>
        <Numero rotulo="Vendas no mês" valor={r.nVendas} />
        <Numero rotulo="Ativos agora" valor={r.ativos} />
        <Numero
          rotulo="Terminam já"
          valor={r.aExpirar.length}
          destaque={r.aExpirar.length > 0}
          onClick={() => ir("vendas", "a-expirar")}
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* lista de trabalho */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-extrabold">Para tratar</h2>
            {porLembrar > 0 ? (
              <Button size="sm" variant="whatsapp" onClick={a.cobrancaDoDia}>
                <MegaphoneIcon /> Cobrança do dia · {porLembrar}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">{aTratar.length} clientes</span>
            )}
          </div>

          {r.pendentes.length > 0 && (
            <div className="mb-4 rounded-xl border-2 border-dashed border-roxo/60 bg-roxo/[0.04] p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-roxo">
                {r.pendentes.length} {r.pendentes.length === 1 ? "pedido pendente" : "pedidos pendentes"}
              </p>
              <ul className="space-y-1.5">
                {r.pendentes.slice(0, 4).map((v) => (
                  <li key={v.id} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {v.nomeCliente} <span className="font-normal text-ink-soft">· {v.servico} {v.pacote}</span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => a.aprovar(v)}>
                      <CheckIcon /> Aprovar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aTratar.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-ink/20 px-6 py-10 text-center">
              <p className="text-lg font-extrabold">Nada a cobrar por agora.</p>
              <p className="mt-1 text-sm text-muted-foreground">Ninguém termina nos próximos 3 dias.</p>
            </div>
          ) : (
            <ul className="divide-y-[1.5px] divide-dashed divide-ink/15 rounded-xl border-[1.5px] border-ink/80 bg-paper-2">
              {aTratar.slice(0, 12).map((v) => {
                const dias = diasRestantes(v, agora)
                const expirado = estadoDe(v, agora) === "expirado"
                return (
                  <li key={v.id} className="flex items-center gap-3 px-3.5 py-3">
                    <IconeServico servico={v.servico} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{v.nomeCliente}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {v.perfil} ·{" "}
                        <span className={cn("num font-semibold", expirado ? "text-coral-ink" : "rounded bg-sol px-1 text-ink")}>
                          {quando(dias, estadoDe(v, agora) === "expirado", v.dataExpiracao)}
                        </span>
                      </p>
                    </div>
                    {lembradoHoje(v, agora) ? (
                      <span className="grid size-9 place-items-center text-verde" title="Já lembrado hoje">
                        <CheckCheckIcon className="size-4" />
                      </span>
                    ) : (
                      <Button size="icon" variant="ghost" aria-label="Lembrar no WhatsApp" onClick={() => a.cobrar(v)}>
                        <BellRingIcon />
                      </Button>
                    )}
                    <Button size="sm" variant="coral" onClick={() => a.renovar(v)}>
                      <RefreshCwIcon /> <span className="hidden sm:inline">Renovar</span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
          {aTratar.length > 12 && (
            <Button variant="link" className="mt-2 px-0" onClick={() => ir("vendas", "a-expirar")}>
              Ver todos <ArrowRightIcon />
            </Button>
          )}
        </section>

        <div className="space-y-10">
          {/* ocupação */}
          <section>
            <h2 className="mb-4 text-2xl font-extrabold">Vagas</h2>
            <div className="space-y-4">
              {servicos.map((s) => {
                const perfis = contas[s]?.perfis ?? []
                const o = ocupacao(vendas, s, agora)
                const usadas = perfis.reduce((t, p) => t + Math.min(LIMITE_POR_PERFIL, o[p.nome] ?? 0), 0)
                const total = perfis.length * LIMITE_POR_PERFIL
                return (
                  <div key={s} className="rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-3.5">
                    <div className="mb-3 flex items-center gap-2.5">
                      <IconeServico servico={s} className="size-8" />
                      <span className="flex-1 font-extrabold">{s}</span>
                      <span className="num text-sm">
                        <b>{total - usadas}</b> <span className="text-muted-foreground">livres de {total}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-2">
                      {perfis.map((p) => (
                        <div key={p.nome} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold">{p.nome}</span>
                          <Vagas usadas={Math.min(LIMITE_POR_PERFIL, o[p.nome] ?? 0)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* receita 6 meses, por serviço */}
          <CartaoGrafico
            titulo="Últimos 6 meses"
            subtitulo="Receita por serviço"
            legenda={servicos.map((x) => ({ nome: x, cor: corDoServico(x, servicos) }))}
            altura={190}
            acao={
              <Button size="sm" variant="ghost" onClick={() => ir("relatorios")}>
                Relatórios <ArrowRightIcon />
              </Button>
            }
            tabela={{
              colunas: ["Mês", ...servicos, "Total"],
              linhas: seisMeses.map((m) => [m.mes, ...servicos.map((x) => Number(m[x]) || 0), m.total]),
            }}
          >
            <BarChart data={seisMeses} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={COR_GRAFICO.grelha} />
              <XAxis dataKey="mes" {...eixo} />
              <YAxis {...eixo} {...escala(seisMeses.map((m) => m.total))} tickFormatter={compacto} width={40} />
              <Tooltip cursor={{ fill: "rgba(29,26,22,.05)" }} content={<ConteudoTooltip total />} />
              {servicos.map((x, k) => (
                <Bar
                  isAnimationActive={false}
                  key={x}
                  dataKey={x}
                  name={x}
                  stackId="s"
                  fill={corDoServico(x, servicos)}
                  stroke={COR_GRAFICO.fundo}
                  strokeWidth={2}
                  maxBarSize={24}
                  radius={k === servicos.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </CartaoGrafico>
        </div>
      </div>
    </>
  )
}

function Numero({
  rotulo,
  valor,
  destaque = false,
  onClick,
}: {
  rotulo: string
  valor: number
  destaque?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-3 text-left sm:p-4",
        onClick && "transition-shadow hover:stamp-shadow-sm",
        destaque && "border-2 border-coral-ink",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px] sm:tracking-[0.12em]">{rotulo}</p>
      <p className={cn("num mt-2 text-[28px] sm:text-[32px] leading-none font-semibold", destaque && "text-coral-ink")}>{valor}</p>
    </Comp>
  )
}
