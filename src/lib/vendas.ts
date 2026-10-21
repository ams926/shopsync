import { Timestamp, type DocumentData } from "firebase/firestore"
import type { ContaServico, EstadoVenda, Pacote, Venda } from "./types"

/** Quantos dias antes do fim uma subscrição passa a "a expirar". */
export const DIAS_AVISO = 3
/** Quantos clientes podem partilhar o mesmo perfil (regra do site antigo). */
export const LIMITE_POR_PERFIL = 3

const DIA = 86_400_000

const CAMPOS_CONHECIDOS = new Set([
  "nomeCliente",
  "telefone",
  "emailCliente",
  "servico",
  "pacote",
  "perfil",
  "precoMZN",
  "preco",
  "status",
  "dataRegisto",
  "dataExpiracao",
  "diasPacote",
  "comprovativo",
  "renovadoPara",
  "renovadoDe",
  "ultimoLembrete",
])

export function paraData(valor: unknown): Date | null {
  if (!valor) return null
  if (valor instanceof Timestamp) return valor.toDate()
  if (valor instanceof Date) return valor
  if (typeof valor === "string" || typeof valor === "number") {
    const d = new Date(valor)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof valor === "object" && valor !== null && "seconds" in valor) {
    return new Date(Number((valor as { seconds: number }).seconds) * 1000)
  }
  return null
}

export function normalizarVenda(id: string, d: DocumentData): Venda {
  const extra: Record<string, unknown> = {}
  for (const k of Object.keys(d)) if (!CAMPOS_CONHECIDOS.has(k)) extra[k] = d[k]
  return {
    id,
    nomeCliente: String(d.nomeCliente ?? "Sem nome"),
    telefone: String(d.telefone ?? ""),
    emailCliente: String(d.emailCliente ?? ""),
    servico: String(d.servico ?? ""),
    pacote: String(d.pacote ?? ""),
    perfil: String(d.perfil ?? ""),
    precoMZN: Number(d.precoMZN ?? d.preco ?? 0) || 0,
    status: String(d.status ?? "ativo"),
    dataRegisto: paraData(d.dataRegisto) ?? new Date(0),
    dataExpiracao: paraData(d.dataExpiracao),
    diasPacote: d.diasPacote != null ? Number(d.diasPacote) : undefined,
    comprovativo: d.comprovativo ? String(d.comprovativo) : undefined,
    renovadoPara: d.renovadoPara ? String(d.renovadoPara) : undefined,
    renovadoDe: d.renovadoDe ? String(d.renovadoDe) : undefined,
    ultimoLembrete: paraData(d.ultimoLembrete) ?? undefined,
    extra,
  }
}

export function estadoDe(v: Venda, agora: Date = new Date()): EstadoVenda {
  if (v.status === "pendente") return "pendente"
  if (v.status === "renovado") return "renovado"
  if (!v.dataExpiracao || v.dataExpiracao <= agora) return "expirado"
  const dias = (v.dataExpiracao.getTime() - agora.getTime()) / DIA
  return dias <= DIAS_AVISO ? "a-expirar" : "ativo"
}

/** Dias que faltam (positivo) ou que já passaram (negativo), contados por dia de calendário. */
export function diasRestantes(v: Venda, agora: Date = new Date()): number | null {
  if (!v.dataExpiracao) return null
  return Math.round((inicioDoDia(v.dataExpiracao).getTime() - inicioDoDia(agora).getTime()) / DIA)
}

export function ocupaVaga(v: Venda, agora: Date): boolean {
  const e = estadoDe(v, agora)
  return e === "ativo" || e === "a-expirar"
}

/** Quantos clientes ativos tem cada perfil de um serviço. */
export function ocupacao(vendas: Venda[], servico: string, agora: Date, ignorarId?: string) {
  const mapa: Record<string, number> = {}
  for (const v of vendas) {
    if (v.servico !== servico || v.id === ignorarId) continue
    if (!ocupaVaga(v, agora)) continue
    mapa[v.perfil] = (mapa[v.perfil] ?? 0) + 1
  }
  return mapa
}

export function inicioDoDia(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function somarDias(d: Date, dias: number) {
  const n = new Date(d)
  n.setDate(n.getDate() + dias)
  return n
}

export function pacoteDe(conta: ContaServico | undefined, nome: string): Pacote | undefined {
  return conta?.pacotes?.find((p) => p.nome === nome)
}

export function pinDe(conta: ContaServico | undefined, perfil: string): string {
  return conta?.perfis?.find((p) => p.nome === perfil)?.pin ?? ""
}

/** Telefone no formato que já está guardado: "+258 841234567". */
export function normalizarTelefone(entrada: string): string {
  const digitos = entrada.replace(/\D/g, "")
  if (!digitos) return ""
  if (digitos.length <= 9) return `+258 ${digitos}`
  if (digitos.startsWith("258")) return `+258 ${digitos.slice(3)}`
  return `+${digitos}`
}

/** Só os 9 dígitos locais, para mostrar no campo do formulário. */
export function telefoneLocal(guardado: string): string {
  const digitos = guardado.replace(/\D/g, "")
  return digitos.startsWith("258") && digitos.length > 9 ? digitos.slice(3) : digitos
}

/** Chave para juntar as vendas do mesmo cliente. */
export function chaveCliente(v: Venda): string {
  const local = telefoneLocal(v.telefone)
  return local || v.nomeCliente.trim().toLowerCase()
}

export function numeroRecibo(v: Venda) {
  return `SS-${v.id.slice(0, 6).toUpperCase()}`
}

export function lembradoHoje(v: Venda, agora: Date = new Date()): boolean {
  return Boolean(v.ultimoLembrete && inicioDoDia(v.ultimoLembrete).getTime() === inicioDoDia(agora).getTime())
}

/**
 * Quem deve ser lembrado hoje: termina nos próximos dias ou terminou há pouco
 * (até 7 dias) e ainda não renovou.
 */
export function paraCobrar(vendas: Venda[], agora: Date = new Date()): Venda[] {
  return vendas
    .filter((v) => {
      const e = estadoDe(v, agora)
      if (e === "a-expirar") return true
      if (e !== "expirado") return false
      const d = diasRestantes(v, agora)
      return d !== null && d >= -7
    })
    .sort((a, b) => (a.dataExpiracao?.getTime() ?? 0) - (b.dataExpiracao?.getTime() ?? 0))
}
