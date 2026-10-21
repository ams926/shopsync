const nf = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 })

export function mt(valor: number) {
  return `${nf.format(valor)} MT`
}

export function data(d: Date | null | undefined) {
  if (!d) return "—"
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "")
}

export function dataCurta(d: Date | null | undefined) {
  if (!d) return "—"
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(/\./g, "")
}

export function dataNumerica(d: Date | null | undefined) {
  if (!d) return "—"
  return d.toLocaleDateString("pt-PT")
}

/** Valor para <input type="date"> no fuso local. */
export function paraInputData(d: Date) {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${a}-${m}-${dia}`
}

export function deInputData(valor: string): Date {
  const [a, m, d] = valor.split("-").map(Number)
  if (!a || !m || !d) return new Date()
  const agora = new Date()
  // guarda a hora atual, para não cair na véspera por causa do fuso
  return new Date(a, m - 1, d, agora.getHours(), agora.getMinutes())
}

export function quando(dias: number | null, jaTerminou = false): string {
  if (dias === null) return "sem data"
  if (dias === 0) return jaTerminou ? "terminou hoje" : "termina hoje"
  if (dias === 1) return "termina amanhã"
  if (dias > 1) return `faltam ${dias} dias`
  if (dias === -1) return "terminou ontem"
  return `terminou há ${Math.abs(dias)} dias`
}

export function mesAno(d: Date) {
  return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase()
}
