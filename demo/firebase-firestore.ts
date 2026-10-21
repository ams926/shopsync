// Firestore em memória para o modo de demonstração, com dados de exemplo.
export type DocumentData = Record<string, any>

export class Timestamp {
  constructor(public seconds: number) {}
  toDate() {
    return new Date(this.seconds * 1000)
  }
  static fromDate(d: Date) {
    return new Timestamp(Math.floor(d.getTime() / 1000))
  }
}

type Ref = { tipo: "col"; nome: string } | { tipo: "doc"; col: string; id: string }
const dados: Record<string, Map<string, DocumentData>> = { vendas: new Map(), configuracoes: new Map() }
const ouvintes = new Set<() => void>()
const avisar = () => setTimeout(() => ouvintes.forEach((f) => f()), 30)
const novoId = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
const paraTs = (o: DocumentData) => {
  const r: DocumentData = {}
  for (const [k, v] of Object.entries(o)) r[k] = v instanceof Date ? Timestamp.fromDate(v) : v
  return r
}

export const deleteField = () => ({ __apagar: true })
export function getFirestore() {
  return {}
}
export function collection(_db: unknown, nome: string): Ref {
  return { tipo: "col", nome }
}
export function doc(a: any, col?: string, id?: string): Ref {
  if (a && a.tipo === "col") return { tipo: "doc", col: a.nome, id: col ?? novoId() }
  return { tipo: "doc", col: col!, id: id! }
}
export function onSnapshot(ref: Ref, next: (s: any) => void) {
  const f = () => {
    if (ref.tipo === "col") {
      const m = dados[ref.nome] ?? new Map()
      next({ docs: [...m.entries()].map(([id, d]) => ({ id, data: () => d })) })
    } else {
      const d = dados[ref.col]?.get(ref.id)
      next({ exists: () => !!d, data: () => d })
    }
  }
  ouvintes.add(f)
  setTimeout(f, 120)
  return () => ouvintes.delete(f)
}
export async function addDoc(ref: Ref, d: DocumentData) {
  if (ref.tipo !== "col") throw new Error("addDoc precisa de coleção")
  const id = novoId()
  dados[ref.nome].set(id, paraTs(d))
  avisar()
  return { id }
}
export async function setDoc(ref: Ref, d: DocumentData, op?: { merge?: boolean }) {
  if (ref.tipo !== "doc") throw new Error("setDoc precisa de documento")
  dados[ref.col].set(ref.id, op?.merge ? { ...dados[ref.col].get(ref.id), ...paraTs(d) } : paraTs(d))
  avisar()
}
export async function updateDoc(ref: Ref, d: DocumentData) {
  if (ref.tipo !== "doc") throw new Error("updateDoc precisa de documento")
  const m = dados[ref.col]
  m.set(ref.id, { ...m.get(ref.id), ...paraTs(d) })
  avisar()
}
export async function deleteDoc(ref: Ref) {
  if (ref.tipo === "doc") dados[ref.col].delete(ref.id)
  avisar()
}
export function writeBatch() {
  const ops: (() => void)[] = []
  return {
    set(ref: Ref, d: DocumentData) {
      ops.push(() => ref.tipo === "doc" && dados[ref.col].set(ref.id, paraTs(d)))
    },
    update(ref: Ref, d: DocumentData) {
      ops.push(() => ref.tipo === "doc" && dados[ref.col].set(ref.id, { ...dados[ref.col].get(ref.id), ...paraTs(d) }))
    },
    async commit() {
      ops.forEach((o) => o())
      avisar()
    },
  }
}

// ---------- dados de exemplo ----------
const pacotes = (p: number[]) => [
  { dias: 1, nome: "1 Dia", preco: p[0] },
  { dias: 7, nome: "7 Dias", preco: p[1] },
  { dias: 15, nome: "15 Dias", preco: p[2] },
  { dias: 30, nome: "30 Dias", preco: p[3] },
]
dados.configuracoes.set("contasMaster", {
  Netflix: {
    email: "netflix.exemplo@gmail.com",
    senha: "Exemplo#2026",
    custoMensal: 900,
    pacotes: pacotes([39, 119, 179, 299]),
    perfis: [
      { nome: "ShopSync", pin: "1212" },
      { nome: "PALERMO", pin: "7698" },
      { nome: "MAEVE", pin: "5555" },
      { nome: "GOJO", pin: "2524" },
      { nome: "TOKYO", pin: "8031" },
    ],
  },
  "Prime Video": {
    email: "prime.exemplo@gmail.com",
    senha: "Prime@2026",
    custoMensal: 450,
    pacotes: pacotes([35, 99, 149, 249]),
    perfis: [
      { nome: "B.B", pin: "40213" },
      { nome: "ZORO", pin: "11092" },
      { nome: "NAMI", pin: "73310" },
      { nome: "LUFFY", pin: "50021" },
    ],
  },
})

const nomes = [
  "Silvia Manuel", "Carlos Mondlane", "Ana Chissano", "Edson Macuácua", "Fátima Bila", "Nelson Cossa",
  "Lurdes Nhantumbo", "Hélder Sitoe", "Graça Mabunda", "Ivo Tembe", "Neusa Langa", "Osvaldo Muianga",
  "Paula Zandamela", "Rui Massingue", "Telma Chirindza", "Valter Mucavele", "Yolanda Cumbe", "Zacarias Nhaca",
]
const dia = 86400000
const agora = Date.now()
let semente = 7
const rnd = () => ((semente = (semente * 16807) % 2147483647) / 2147483647)
const vendasExemplo: [number, string, string, string, number][] = [
  // [índice do nome, serviço, perfil, pacote, dias até ao fim]
  [0, "Prime Video", "B.B", "30 Dias", 0], [1, "Netflix", "PALERMO", "30 Dias", 1], [2, "Netflix", "MAEVE", "7 Dias", 2],
  [3, "Prime Video", "ZORO", "30 Dias", 3], [4, "Netflix", "GOJO", "30 Dias", -1], [5, "Netflix", "ShopSync", "15 Dias", -4],
  [6, "Prime Video", "NAMI", "30 Dias", 12], [7, "Netflix", "PALERMO", "30 Dias", 18], [8, "Netflix", "PALERMO", "30 Dias", 25],
  [9, "Prime Video", "B.B", "30 Dias", 9], [10, "Netflix", "MAEVE", "30 Dias", 21], [11, "Netflix", "TOKYO", "7 Dias", 5],
  [12, "Prime Video", "LUFFY", "15 Dias", 7], [13, "Netflix", "GOJO", "30 Dias", 27], [14, "Netflix", "ShopSync", "30 Dias", 14],
  [15, "Prime Video", "ZORO", "7 Dias", -9], [16, "Netflix", "TOKYO", "30 Dias", 29], [17, "Prime Video", "B.B", "30 Dias", 16],
]
const preco = (s: string, p: string) =>
  ((dados.configuracoes.get("contasMaster") as any)[s].pacotes as any[]).find((x) => x.nome === p).preco
const diasPac = (p: string) => Number(p.split(" ")[0])
vendasExemplo.forEach(([n, s, perfil, pac, fim], i) => {
  const exp = agora + fim * dia - 3600000
  const reg = exp - diasPac(pac) * dia
  dados.vendas.set(`demo${i}`, {
    nomeCliente: nomes[n], telefone: `+258 8${4 + (n % 4)}${String(1000000 + Math.floor(rnd() * 8999999)).slice(0, 7)}`,
    emailCliente: "", servico: s, perfil, pacote: pac, precoMZN: preco(s, pac), status: "ativo",
    dataRegisto: Timestamp.fromDate(new Date(reg)), dataExpiracao: Timestamp.fromDate(new Date(exp)),
  })
})
// histórico dos meses anteriores, para o gráfico
for (let m = 1; m <= 5; m++) {
  const quantos = 6 + Math.floor(rnd() * 10)
  for (let k = 0; k < quantos; k++) {
    const s = rnd() > 0.45 ? "Netflix" : "Prime Video"
    const pac = rnd() > 0.25 ? "30 Dias" : "7 Dias"
    const reg = agora - m * 30 * dia - Math.floor(rnd() * 25) * dia
    dados.vendas.set(`hist${m}-${k}`, {
      nomeCliente: nomes[Math.floor(rnd() * nomes.length)], telefone: `+258 84${String(Math.floor(rnd() * 9999999)).padStart(7, "0")}`,
      emailCliente: "", servico: s, perfil: s === "Netflix" ? "MAEVE" : "NAMI", pacote: pac, precoMZN: preco(s, pac),
      status: "renovado", dataRegisto: Timestamp.fromDate(new Date(reg)), dataExpiracao: Timestamp.fromDate(new Date(reg + diasPac(pac) * dia)),
    })
  }
}
dados.vendas.set("pend1", {
  nomeCliente: "Délcio Matsinhe", telefone: "+258 845550123", emailCliente: "delcio@email.com", servico: "Netflix",
  pacote: "30 Dias", perfil: "", precoMZN: 299, status: "pendente", diasPacote: 30,
  comprovativo: "PP261020.1530.X7K2", dataRegisto: Timestamp.fromDate(new Date(agora - 3600000)),
})
