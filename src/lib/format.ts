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

/**
 * O site antigo guardava só o dia (meia-noite UTC = 02:00 em Maputo).
 * Nessas vendas não mostramos a hora, porque não é a hora verdadeira.
 */
export function temHora(d: Date | null | undefined): d is Date {
  if (!d) return false
  return !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0)
}

export function hora(d: Date | null | undefined) {
  if (!d) return ""
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
}

/** "21 out 2026, 14:30" (ou só a data, nas vendas antigas sem hora). */
export function dataHora(d: Date | null | undefined) {
  if (!d) return "—"
  return temHora(d) ? `${data(d)}, ${hora(d)}` : data(d)
}

/** "21/10/2026 às 14:30" (ou só a data). */
export function dataHoraNumerica(d: Date | null | undefined) {
  if (!d) return "—"
  return temHora(d) ? `${dataNumerica(d)} às ${hora(d)}` : dataNumerica(d)
}

/** Valor para <input type="datetime-local"> no fuso local. */
export function paraInputDataHora(d: Date) {
  return `${paraInputData(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function deInputDataHora(valor: string): Date {
  const [dia, h] = valor.split("T")
  const [a, m, d] = (dia ?? "").split("-").map(Number)
  const [hh, mm] = (h ?? "").split(":").map(Number)
  if (!a || !m || !d) return new Date()
  return new Date(a, m - 1, d, Number.isFinite(hh) ? hh : 12, Number.isFinite(mm) ? mm : 0)
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

export function quando(dias: number | null, jaTerminou = false, fim?: Date | null): string {
  if (dias === null) return "sem data"
  const as = temHora(fim) ? ` às ${hora(fim)}` : ""
  if (dias === 0) return jaTerminou ? `terminou hoje${as}` : `termina hoje${as}`
  if (dias === 1) return `termina amanhã${as}`
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
