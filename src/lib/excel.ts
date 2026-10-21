import { agruparPorCliente, contaNaReceita, tabelaMensal } from "./relatorios"
import { estadoDe } from "./vendas"
import type { ContasMaster, EstadoVenda, Venda } from "./types"

const ESTADO: Record<EstadoVenda, string> = {
  ativo: "Ativo",
  "a-expirar": "A expirar",
  expirado: "Expirado",
  pendente: "Pendente",
  renovado: "Renovado",
}

const cab = (t: string) => ({ value: t, fontWeight: "bold" as const, backgroundColor: "#F2EBDD" })
const dinheiro = (n: number) => ({ value: n, type: Number, format: "#,##0" })
// o Excel não tem fusos horários: grava-se a hora "de parede" de Maputo como se fosse UTC
const parede = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()))
const dataCel = (d: Date | null | undefined) => (d ? { value: parede(d), type: Date, format: "dd/mm/yyyy" } : null)

/** Cria e descarrega um .xlsx com três folhas: Vendas, Clientes e Resumo mensal. */
export async function exportarExcel(vendas: Venda[], contas: ContasMaster, servicos: string[], agora: Date) {
  // a biblioteca só é descarregada quando é precisa
  const { default: writeXlsxFile } = await import("write-excel-file/browser")

  const ordenadas = [...vendas].sort((a, b) => b.dataRegisto.getTime() - a.dataRegisto.getTime())
  const folhaVendas = [
    ["Cliente", "Telefone", "Email", "Serviço", "Pacote", "Perfil", "Valor (MT)", "Início", "Fim", "Estado", "ID"].map(cab),
    ...ordenadas.map((v) => [
      v.nomeCliente,
      v.telefone,
      v.emailCliente || null,
      v.servico,
      v.pacote,
      v.perfil || null,
      dinheiro(v.precoMZN),
      dataCel(v.dataRegisto),
      dataCel(v.dataExpiracao),
      ESTADO[estadoDe(v, agora)],
      v.id,
    ]),
  ]

  const clientes = [...agruparPorCliente(vendas).values()]
    .map((l) => {
      const ult = l[l.length - 1]
      const pagas = l.filter(contaNaReceita)
      const ativo = l.some((v) => {
        const e = estadoDe(v, agora)
        return e === "ativo" || e === "a-expirar"
      })
      return {
        nome: ult.nomeCliente,
        telefone: ult.telefone,
        servicos: [...new Set(l.map((v) => v.servico))].join(", "),
        compras: pagas.length,
        total: pagas.reduce((s, v) => s + v.precoMZN, 0),
        primeira: l[0].dataRegisto,
        ultima: ult.dataRegisto,
        ativo,
      }
    })
    .sort((a, b) => b.total - a.total)
  const folhaClientes = [
    ["Cliente", "Telefone", "Serviços", "Compras", "Total gasto (MT)", "Primeira compra", "Última compra", "Ativo agora"].map(cab),
    ...clientes.map((c) => [
      c.nome,
      c.telefone,
      c.servicos,
      c.compras,
      dinheiro(c.total),
      dataCel(c.primeira),
      dataCel(c.ultima),
      c.ativo ? "Sim" : "Não",
    ]),
  ]

  const meses = tabelaMensal(vendas, contas, servicos, agora)
  const valor = (m: object, k: string) => Number((m as Record<string, unknown>)[k]) || 0
  const outros = meses.some((m) => valor(m, "Outros") > 0)
  const cols = outros ? [...servicos, "Outros"] : servicos
  const folhaResumo = [
    ["Mês", "Vendas", ...cols.map((s) => `${s} (MT)`), "Receita (MT)", "Custo das contas (MT)", "Lucro (MT)"].map(cab),
    ...meses.map((m) => [
      { value: parede(m.inicio), type: Date, format: "mmm yyyy" },
      m.vendas,
      ...cols.map((s) => dinheiro(valor(m, s))),
      dinheiro(m.total),
      dinheiro(m.custos),
      dinheiro(m.total - m.custos),
    ]),
  ]

  const largura = (n: number[]) => n.map((width) => ({ width }))
  const hoje = agora.toISOString().slice(0, 10)
  await writeXlsxFile([
    { data: folhaVendas, sheet: "Vendas", columns: largura([24, 16, 24, 13, 10, 12, 11, 12, 12, 11, 22]), stickyRowsCount: 1 },
    { data: folhaClientes, sheet: "Clientes", columns: largura([24, 16, 22, 10, 15, 15, 15, 11]), stickyRowsCount: 1 },
    { data: folhaResumo, sheet: "Resumo mensal", columns: largura([12, 9, ...cols.map(() => 15), 14, 20, 12]), stickyRowsCount: 1 },
  ]).toFile(`ShopSync_${hoje}.xlsx`)
}
