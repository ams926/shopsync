import { chaveCliente, estadoDe, inicioDoDia, ocupaVaga } from "./vendas"
import type { ContasMaster, Venda } from "./types"

export type Periodo = "mes" | "3m" | "12m"

export const PERIODOS: { id: Periodo; nome: string; meses: number }[] = [
  { id: "mes", nome: "Este mês", meses: 1 },
  { id: "3m", nome: "3 meses", meses: 3 },
  { id: "12m", nome: "12 meses", meses: 12 },
]

const DIA = 86_400_000

/** Conta para a receita: tudo o que não é pedido pendente. */
export const contaNaReceita = (v: Venda) => v.status !== "pendente"

export function inicioDoMes(d: Date, desvio = 0) {
  return new Date(d.getFullYear(), d.getMonth() + desvio, 1)
}

export function nomeMes(d: Date, comAno = false) {
  const m = d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "")
  return comAno ? `${m} ${String(d.getFullYear()).slice(2)}` : m
}

export interface Intervalo {
  inicio: Date
  fim: Date
  /** primeiro dia de cada mês do período, do mais antigo para o atual */
  meses: Date[]
}

export function intervaloDe(p: Periodo, agora: Date, desvio = 0): Intervalo {
  const n = PERIODOS.find((x) => x.id === p)!.meses
  const fim = inicioDoMes(agora, 1 - desvio * n)
  const inicio = inicioDoMes(agora, 1 - n - desvio * n)
  const meses = Array.from({ length: n }, (_, i) => inicioDoMes(inicio, i))
  return { inicio, fim, meses }
}

const dentro = (d: Date, i: { inicio: Date; fim: Date }) => d >= i.inicio && d < i.fim

export function custoMensalTotal(contas: ContasMaster) {
  return Object.values(contas).reduce((s, c) => s + (Number(c.custoMensal) || 0), 0)
}

/** Primeiro mês com vendas: antes disso o negócio não tinha custos a contar. */
export function primeiroMes(vendas: Venda[]): Date | null {
  let min: number | null = null
  for (const v of vendas) if (contaNaReceita(v) && v.dataRegisto.getTime() > 0) min = min === null ? v.dataRegisto.getTime() : Math.min(min, v.dataRegisto.getTime())
  return min === null ? null : inicioDoMes(new Date(min))
}

/** Custo das contas num mês (zero antes da primeira venda). */
export function custoDoMes(contas: ContasMaster, mes: Date, primeiro: Date | null) {
  return primeiro && mes >= primeiro ? custoMensalTotal(contas) : 0
}

export function temCustos(contas: ContasMaster) {
  return Object.values(contas).some((c) => Number(c.custoMensal) > 0)
}

/** Uma venda conta como "renovada" se o mesmo cliente comprou o mesmo serviço depois dela. */
export function foiRenovada(v: Venda, porCliente: Map<string, Venda[]>) {
  if (v.status === "renovado") return true
  const outras = porCliente.get(chaveCliente(v)) ?? []
  return outras.some((o) => o.id !== v.id && o.servico === v.servico && contaNaReceita(o) && o.dataRegisto.getTime() > v.dataRegisto.getTime() + DIA / 2)
}

export function agruparPorCliente(vendas: Venda[]) {
  const m = new Map<string, Venda[]>()
  for (const v of vendas) {
    const k = chaveCliente(v)
    const l = m.get(k)
    if (l) l.push(v)
    else m.set(k, [v])
  }
  for (const l of m.values()) l.sort((a, b) => a.dataRegisto.getTime() - b.dataRegisto.getTime())
  return m
}

export interface Resumo {
  receita: number
  receitaAnterior: number
  custos: number
  lucro: number
  nVendas: number
  ticketMedio: number
  terminadas: number
  renovadas: number
  taxaRenovacao: number | null
}

export function resumo(vendas: Venda[], contas: ContasMaster, p: Periodo, agora: Date): Resumo {
  const i = intervaloDe(p, agora)
  const ant = intervaloDe(p, agora, 1)
  const doPeriodo = vendas.filter((v) => contaNaReceita(v) && dentro(v.dataRegisto, i))
  const receita = doPeriodo.reduce((s, v) => s + v.precoMZN, 0)
  const receitaAnterior = vendas
    .filter((v) => contaNaReceita(v) && dentro(v.dataRegisto, ant))
    .reduce((s, v) => s + v.precoMZN, 0)
  const primeiro = primeiroMes(vendas)
  const custos = i.meses.reduce((s, m) => s + custoDoMes(contas, m, primeiro), 0)

  // taxa de renovação: das subscrições que terminaram neste período (até hoje), quantas foram renovadas
  const porCliente = agruparPorCliente(vendas)
  const terminadasL = vendas.filter(
    (v) => contaNaReceita(v) && v.dataExpiracao && dentro(v.dataExpiracao, { inicio: i.inicio, fim: agora }),
  )
  const renovadas = terminadasL.filter((v) => foiRenovada(v, porCliente)).length

  return {
    receita,
    receitaAnterior,
    custos,
    lucro: receita - custos,
    nVendas: doPeriodo.length,
    ticketMedio: doPeriodo.length ? receita / doPeriodo.length : 0,
    terminadas: terminadasL.length,
    renovadas,
    taxaRenovacao: terminadasL.length ? renovadas / terminadasL.length : null,
  }
}

export type LinhaMensal = { mes: string; chave: string; lucro: number | null; total: number } & Record<string, number | string | null>

/** Receita por mês e por serviço (sempre os últimos 12 meses, para dar contexto). */
export function mensalPorServico(vendas: Venda[], contas: ContasMaster, servicos: string[], agora: Date, nMeses = 12) {
  const comCustos = temCustos(contas)
  const primeiro = primeiroMes(vendas)
  return Array.from({ length: nMeses }, (_, k) => {
    const ini = inicioDoMes(agora, k - nMeses + 1)
    const fim = inicioDoMes(ini, 1)
    const linha: LinhaMensal = { mes: nomeMes(ini, ini.getMonth() === 0), chave: ini.toISOString(), lucro: null, total: 0 }
    for (const s of servicos) linha[s] = 0
    for (const v of vendas) {
      if (!contaNaReceita(v) || v.dataRegisto < ini || v.dataRegisto >= fim) continue
      const s = servicos.includes(v.servico) ? v.servico : "Outros"
      linha[s] = (Number(linha[s]) || 0) + v.precoMZN
      linha.total += v.precoMZN
    }
    linha.lucro = comCustos && primeiro && ini >= primeiro ? linha.total - custoDoMes(contas, ini, primeiro) : null
    return linha
  })
}

/** Receita acumulada dia a dia: este mês contra o mês passado. */
export function ritmoDoMes(vendas: Venda[], agora: Date) {
  const ini = inicioDoMes(agora)
  const iniAnt = inicioDoMes(agora, -1)
  const diasMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasAnt = new Date(agora.getFullYear(), agora.getMonth(), 0).getDate()
  const porDia = (de: Date, n: number) => {
    const a = new Array<number>(n).fill(0)
    for (const v of vendas) {
      if (!contaNaReceita(v)) continue
      const d = v.dataRegisto
      if (d.getFullYear() === de.getFullYear() && d.getMonth() === de.getMonth()) a[d.getDate() - 1] += v.precoMZN
    }
    return a
  }
  const atual = porDia(ini, diasMes)
  const anterior = porDia(iniAnt, diasAnt)
  const hoje = agora.getDate()
  let sa = 0
  let sb = 0
  return Array.from({ length: Math.max(diasMes, diasAnt) }, (_, k) => {
    if (k < diasMes) sa += atual[k]
    if (k < diasAnt) sb += anterior[k]
    return { dia: k + 1, atual: k < hoje ? sa : null, anterior: k < diasAnt ? sb : null }
  })
}

/** Quantas vezes cada pacote foi vendido no período, por serviço. */
export function pacotesVendidos(vendas: Venda[], servicos: string[], i: Intervalo) {
  const m = new Map<string, Record<string, number>>()
  for (const v of vendas) {
    if (!contaNaReceita(v) || !dentro(v.dataRegisto, i)) continue
    const s = servicos.includes(v.servico) ? v.servico : "Outros"
    const r = m.get(v.pacote) ?? {}
    r[s] = (r[s] ?? 0) + 1
    m.set(v.pacote, r)
  }
  const dias = (nome: string) => Number(nome.match(/\d+/)?.[0] ?? 999)
  return [...m.entries()]
    .map(([pacote, r]) => ({ pacote, ...r, total: Object.values(r).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => dias(a.pacote) - dias(b.pacote))
}

/** Ocupação atual de cada perfil (clientes ativos / limite). */
export function ocupacaoPerfis(vendas: Venda[], contas: ContasMaster, servicos: string[], agora: Date) {
  return servicos.map((s) => {
    const mapa: Record<string, number> = {}
    for (const v of vendas) if (v.servico === s && ocupaVaga(v, agora)) mapa[v.perfil] = (mapa[v.perfil] ?? 0) + 1
    return { servico: s, perfis: (contas[s]?.perfis ?? []).map((p) => ({ nome: p.nome, usadas: mapa[p.nome] ?? 0 })) }
  })
}

/** Por mês: vendas a clientes novos e a clientes que já tinham comprado antes. */
export function novosVsRecorrentes(vendas: Venda[], i: Intervalo) {
  const porCliente = agruparPorCliente(vendas.filter(contaNaReceita))
  const primeira = new Map<string, number>()
  for (const [k, l] of porCliente) primeira.set(k, l[0].dataRegisto.getTime())
  return i.meses.map((ini) => {
    const fim = inicioDoMes(ini, 1)
    let novos = 0
    let recorrentes = 0
    for (const v of vendas) {
      if (!contaNaReceita(v) || v.dataRegisto < ini || v.dataRegisto >= fim) continue
      if (primeira.get(chaveCliente(v)) === v.dataRegisto.getTime()) novos++
      else recorrentes++
    }
    return { mes: nomeMes(ini, ini.getMonth() === 0), novos, recorrentes }
  })
}

/** Dinheiro em jogo: subscrições ativas que terminam nos próximos N dias. */
export function aRenovar(vendas: Venda[], agora: Date, dias: number) {
  const limite = new Date(inicioDoDia(agora).getTime() + (dias + 1) * DIA)
  const l = vendas.filter((v) => {
    const e = estadoDe(v, agora)
    return (e === "ativo" || e === "a-expirar") && v.dataExpiracao! < limite
  })
  return { n: l.length, valor: l.reduce((s, v) => s + v.precoMZN, 0) }
}

export function topClientes(vendas: Venda[], i: Intervalo, n = 10) {
  const porCliente = agruparPorCliente(vendas.filter(contaNaReceita))
  const lista = [...porCliente.values()].map((l) => {
    const noPeriodo = l.filter((v) => dentro(v.dataRegisto, i))
    return {
      chave: chaveCliente(l[0]),
      nome: l[l.length - 1].nomeCliente,
      telefone: l[l.length - 1].telefone,
      total: noPeriodo.reduce((s, v) => s + v.precoMZN, 0),
      compras: noPeriodo.length,
      desde: l[0].dataRegisto,
    }
  })
  return lista
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
}

/** Resumo de 12 meses para o Excel. */
export function tabelaMensal(vendas: Venda[], contas: ContasMaster, servicos: string[], agora: Date) {
  return mensalPorServico(vendas, contas, servicos, agora, 12).map((l, k) => {
    const ini = inicioDoMes(agora, k - 11)
    const n = vendas.filter(
      (v) => contaNaReceita(v) && v.dataRegisto >= ini && v.dataRegisto < inicioDoMes(ini, 1),
    ).length
    return { ...l, inicio: ini, vendas: n, custos: custoDoMes(contas, ini, primeiroMes(vendas)) }
  })
}
