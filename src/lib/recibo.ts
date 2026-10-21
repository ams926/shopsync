import type { jsPDF as JsPDF } from "jspdf"
import logoUrl from "@/assets/shopsync-logo.png"
import bricolageRegular from "@/assets/fontes/Bricolage-Regular.ttf?url"
import bricolageBold from "@/assets/fontes/Bricolage-Bold.ttf?url"
import bricolageExtra from "@/assets/fontes/Bricolage-ExtraBold.ttf?url"
import plexRegular from "@/assets/fontes/PlexMono-400.ttf?url"
import plexBold from "@/assets/fontes/PlexMono-600.ttf?url"
import { dataNumerica } from "./format"
import { numeroRecibo, pinDe } from "./vendas"
import type { ContaServico, Venda } from "./types"

/*
  O recibo é desenhado diretamente com jsPDF (sem converter HTML em imagem),
  com as mesmas letras do painel (Bricolage Grotesque e IBM Plex Mono).
  O gerador, o logótipo e as letras são carregados quando a app abre, para que
  "Partilhar" aconteça logo a seguir ao toque — os telemóveis só permitem
  partilhar ficheiros se a partilha começar imediatamente após o clique.
*/

let logo: { data: string; w: number; h: number } | null = null
let PDF: typeof JsPDF | null = null
let fontes: Record<string, string> | null = null

async function carregarPdf() {
  if (!PDF) PDF = (await import("jspdf")).jsPDF
  return PDF
}

const paraBase64 = (buf: ArrayBuffer) => {
  let s = ""
  const b = new Uint8Array(buf)
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

async function carregarFontes() {
  if (fontes) return
  const lista: [string, string][] = [
    ["Bricolage-Regular", bricolageRegular],
    ["Bricolage-Bold", bricolageBold],
    ["Bricolage-ExtraBold", bricolageExtra],
    ["Plex-Regular", plexRegular],
    ["Plex-Bold", plexBold],
  ]
  const r: Record<string, string> = {}
  await Promise.all(lista.map(async ([n, u]) => (r[n] = paraBase64(await (await fetch(u)).arrayBuffer()))))
  fontes = r
}

export async function prepararRecibos() {
  await Promise.all([carregarPdf().catch(() => null), carregarFontes().catch(() => null)])
  if (logo) return
  try {
    const blob = await (await fetch(logoUrl)).blob()
    const data = await new Promise<string>((ok, falha) => {
      const r = new FileReader()
      r.onload = () => ok(String(r.result))
      r.onerror = falha
      r.readAsDataURL(blob)
    })
    const dims = await new Promise<{ w: number; h: number }>((ok) => {
      const img = new Image()
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => ok({ w: 900, h: 188 })
      img.src = data
    })
    logo = { data, ...dims }
  } catch {
    logo = null
  }
}

const COR = {
  papel: "#FBF7EF",
  tinta: "#1D1A16",
  suave: "#6E665C",
  claro: "#9A9285",
  linha: "#DDD2BE",
  coral: "#FF5A45",
  azul: "#1A73FF",
  sol: "#FFD447",
  verde: "#1F8A5B",
  fundo: "#EFE7D8",
}

const corDoServico = (s: string) => (/netflix/i.test(s) ? COR.coral : /prime/i.test(s) ? COR.azul : "#4B2E83")

function nomeFicheiro(v: Venda) {
  const limpo = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  return `Recibo_${limpo(v.servico)}_${limpo(v.nomeCliente)}.pdf`
}

const DIA = 86_400_000
const dataLonga = (d: Date | null) =>
  d ? d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" }) : "—"

export function criarRecibo(v: Venda, conta: ContaServico | undefined): { blob: Blob; nome: string } {
  if (!PDF) throw new Error("O gerador de PDF ainda está a carregar")
  const pdf = new PDF({ unit: "mm", format: "a5", orientation: "portrait" })
  const L = 148
  const A = 210
  const M = 13
  const W = L - 2 * M

  // letras da marca (com recurso às letras padrão do PDF, se falharem)
  let sans = "helvetica"
  let mono = "courier"
  if (fontes) {
    const reg = (ficheiro: string, familia: string, estilo: string) => {
      pdf.addFileToVFS(`${ficheiro}.ttf`, fontes![ficheiro])
      pdf.addFont(`${ficheiro}.ttf`, familia, estilo)
    }
    reg("Bricolage-Regular", "Bricolage", "normal")
    reg("Bricolage-Bold", "Bricolage", "bold")
    reg("Bricolage-ExtraBold", "BricolageX", "normal")
    reg("Plex-Regular", "Plex", "normal")
    reg("Plex-Bold", "Plex", "bold")
    sans = "Bricolage"
    mono = "Plex"
  }
  const grosso = fontes ? (["BricolageX", "normal"] as const) : (["helvetica", "bold"] as const)

  type Fonte = "sans" | "sansB" | "titulo" | "mono" | "monoB"
  const fonte = (f: Fonte, tam: number, cor = COR.tinta) => {
    if (f === "sans") pdf.setFont(sans, "normal")
    if (f === "sansB") pdf.setFont(sans, "bold")
    if (f === "titulo") pdf.setFont(grosso[0], grosso[1])
    if (f === "mono") pdf.setFont(mono, "normal")
    if (f === "monoB") pdf.setFont(mono, "bold")
    pdf.setFontSize(tam)
    pdf.setTextColor(cor)
  }
  const rotulo = (t: string, x: number, y: number, opcoes: { align?: "left" | "right" } = {}) => {
    fonte("sansB", 6.3, COR.claro)
    const T = t.toUpperCase()
    const esp = 0.35
    // com espaçamento entre letras o alinhamento à direita tem de ser calculado à mão
    const largura = pdf.getTextWidth(T) + esp * (T.length - 1)
    pdf.text(T, opcoes.align === "right" ? x - largura : x, y, { charSpace: esp })
  }
  const cabe = (t: string, largura: number) => (pdf.splitTextToSize(t, largura)[0] as string) ?? t
  const corS = corDoServico(v.servico)
  const spotify = /spotify/i.test(v.servico)

  // ---------- papel e moldura ----------
  pdf.setFillColor(COR.papel)
  pdf.rect(0, 0, L, A, "F")
  pdf.setFillColor(COR.coral)
  pdf.rect(0, 0, L / 2, 2.6, "F")
  pdf.setFillColor(COR.azul)
  pdf.rect(L / 2, 0, L / 2, 2.6, "F")

  // ---------- cabeçalho ----------
  if (logo) {
    const w = 50
    pdf.addImage(logo.data, "PNG", M - 1, 11, w, (w * logo.h) / logo.w)
  } else {
    fonte("titulo", 20)
    pdf.text("ShopSync", M, 21)
  }
  fonte("titulo", 21)
  pdf.text("Recibo", L - M, 19, { align: "right" })
  fonte("monoB", 9.5)
  pdf.text(`Nº ${numeroRecibo(v)}`, L - M, 25, { align: "right" })
  fonte("sans", 7.5, COR.suave)
  pdf.text(`Emitido a ${dataLonga(new Date())}`, L - M, 29.5, { align: "right" })

  pdf.setDrawColor(COR.tinta)
  pdf.setLineWidth(0.6)
  pdf.line(M, 35, L - M, 35)

  // ---------- ficha: cliente / subscrição ----------
  const c2 = M + W / 2 + 4
  let y = 43
  rotulo("Cliente", M, y)
  rotulo("Subscrição", c2, y)
  fonte("sansB", 12.5)
  pdf.text(cabe(v.nomeCliente, W / 2 - 4), M, y + 6.2)
  pdf.text(cabe(v.servico, W / 2 - 4), c2, y + 6.2)
  fonte("mono", 8, COR.suave)
  pdf.text(v.telefone || "—", M, y + 11)
  if (v.emailCliente) pdf.text(cabe(v.emailCliente, W / 2 - 4), M, y + 15)
  fonte("sans", 8.5, COR.suave)
  pdf.text(`Pacote ${v.pacote}`, c2, y + 11)
  pdf.text(spotify ? `Vaga ${v.perfil}` : `Perfil ${v.perfil}`, c2, y + 15)

  // ---------- linha do tempo do período ----------
  y = 68
  pdf.setFillColor(COR.fundo)
  pdf.roundedRect(M, y, W, 24, 3, 3, "F")
  const dias =
    v.dataExpiracao && v.dataRegisto
      ? Math.max(1, Math.round((v.dataExpiracao.getTime() - v.dataRegisto.getTime()) / DIA))
      : null
  const x1 = M + 8
  const x2 = L - M - 8
  const ly = y + 10.5
  pdf.setDrawColor(corS)
  pdf.setLineWidth(1.1)
  pdf.line(x1, ly, x2, ly)
  pdf.setFillColor(corS)
  pdf.circle(x1, ly, 1.7, "F")
  pdf.setFillColor(COR.papel)
  pdf.setDrawColor(corS)
  pdf.setLineWidth(0.8)
  pdf.circle(x2, ly, 1.7, "FD")
  if (dias) {
    const t = `${dias} ${dias === 1 ? "dia" : "dias"}`
    fonte("sansB", 7.5)
    const tw = pdf.getTextWidth(t) + 5
    pdf.setFillColor(COR.fundo)
    pdf.rect((x1 + x2) / 2 - tw / 2, ly - 2.5, tw, 5, "F")
    pdf.text(t, (x1 + x2) / 2, ly + 1, { align: "center" })
  }
  rotulo("Início", x1 - 1.7, y + 5)
  rotulo("Válido até", x2 + 1.7, y + 5, { align: "right" })
  fonte("monoB", 10)
  pdf.text(dataNumerica(v.dataRegisto), x1 - 1.7, y + 18.5)
  pdf.text(dataNumerica(v.dataExpiracao), x2 + 1.7, y + 18.5, { align: "right" })

  // ---------- dados de acesso ----------
  y = 99
  const altAcesso = 46
  pdf.setDrawColor(COR.tinta)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(M, y, W, altAcesso, 3, 3, "S")
  // separador colorido com o nome do serviço
  pdf.setFillColor(corS)
  pdf.roundedRect(M, y, W, 9, 3, 3, "F")
  pdf.rect(M, y + 5, W, 4, "F")
  pdf.setDrawColor(COR.tinta)
  pdf.roundedRect(M, y, W, altAcesso, 3, 3, "S")
  fonte("sansB", 8.3, "#FFFFFF")
  pdf.text(`Acesso ${v.servico}`.toUpperCase(), M + 5, y + 6, { charSpace: 0.35 })
  fonte("sans", 7, "#FFFFFF")
  pdf.text("pessoal e intransmissível", L - M - 5, y + 6, { align: "right" })

  const linhas: [string, string][] = spotify
    ? [
        ["Convite para", v.emailCliente || "o seu email pessoal"],
        ["Método", "Convite automático"],
        ["Vaga", v.perfil],
      ]
    : [
        ["Email", conta?.email || "—"],
        ["Senha", conta?.senha || "—"],
        ["Perfil", v.perfil],
      ]
  let ry = y + 17
  for (const [r, t] of linhas) {
    fonte("sans", 8.5, COR.suave)
    pdf.text(r, M + 5, ry)
    fonte("monoB", 9.5)
    pdf.text(cabe(t, W - 40), M + 31, ry)
    pdf.setDrawColor(COR.linha)
    pdf.setLineWidth(0.25)
    pdf.line(M + 5, ry + 2.6, L - M - 5, ry + 2.6)
    ry += 7.4
  }
  if (!spotify) {
    const pin = (pinDe(conta, v.perfil) || "").split("")
    fonte("sans", 8.5, COR.suave)
    pdf.text("PIN", M + 5, ry + 1.2)
    if (pin.length === 0) {
      fonte("monoB", 9.5)
      pdf.text("—", M + 31, ry + 1.2)
    }
    pin.forEach((dig, k) => {
      const bx = M + 31 + k * 8
      pdf.setFillColor(COR.sol)
      pdf.roundedRect(bx, ry - 4.2, 6.6, 7.4, 1.2, 1.2, "F")
      fonte("monoB", 11.5)
      pdf.text(dig, bx + 3.3, ry + 1.5, { align: "center" })
    })
  }

  // ---------- valores ----------
  y = 152
  rotulo("Descrição", M, y)
  rotulo("Valor", L - M, y, { align: "right" })
  pdf.setDrawColor(COR.linha)
  pdf.setLineWidth(0.25)
  pdf.line(M, y + 2, L - M, y + 2)
  fonte("sansB", 9.5)
  pdf.text(cabe(`${v.servico} · ${v.pacote}`, W - 30), M, y + 8)
  fonte("sans", 7.5, COR.suave)
  pdf.text(`${dataNumerica(v.dataRegisto)} a ${dataNumerica(v.dataExpiracao)}`, M, y + 12)
  fonte("mono", 9.5)
  pdf.text(`${v.precoMZN.toLocaleString("pt-PT")} MT`, L - M, y + 8, { align: "right" })

  // total
  const ty = y + 16
  pdf.setFillColor(COR.tinta)
  pdf.roundedRect(M, ty, W, 13, 2.5, 2.5, "F")
  fonte("sansB", 7.5, COR.papel)
  pdf.text("TOTAL PAGO", M + 5, ty + 8.1, { charSpace: 0.4 })
  fonte("monoB", 15, COR.papel)
  pdf.text(`${v.precoMZN.toLocaleString("pt-PT")} MT`, L - M - 5, ty + 8.9, { align: "right" })

  // carimbo "PAGO"
  {
    const cx = M + 62
    const cy = ty + 6.5
    const ang = (-9 * Math.PI) / 180
    const w = 24
    const h = 9
    const rot = (dx: number, dy: number) => [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)]
    const p = [rot(-w / 2, -h / 2), rot(w / 2, -h / 2), rot(w / 2, h / 2), rot(-w / 2, h / 2)]
    pdf.setDrawColor(COR.sol)
    pdf.setLineWidth(0.7)
    pdf.lines(
      [
        [p[1][0] - p[0][0], p[1][1] - p[0][1]],
        [p[2][0] - p[1][0], p[2][1] - p[1][1]],
        [p[3][0] - p[2][0], p[3][1] - p[2][1]],
        [p[0][0] - p[3][0], p[0][1] - p[3][1]],
      ],
      p[0][0],
      p[0][1],
      [1, 1],
      "S",
      true,
    )
    fonte("titulo", 11, COR.sol)
    pdf.text("PAGO", cx, cy + 1.4, { align: "center", angle: 9, charSpace: 0.8 })
  }

  // ---------- picotado e rodapé ----------
  const py = 194
  pdf.setDrawColor(COR.linha)
  pdf.setLineWidth(0.4)
  pdf.setLineDashPattern([1.4, 1.4], 0)
  pdf.line(7, py - 7, L - 7, py - 7)
  pdf.setLineDashPattern([], 0)
  pdf.setFillColor(COR.fundo)
  pdf.circle(0, py - 7, 3.5, "F")
  pdf.circle(L, py - 7, 3.5, "F")

  fonte("titulo", 11)
  pdf.text("Obrigado pela preferência!", M, py)
  fonte("sans", 7, COR.suave)
  pdf.text(
    pdf.splitTextToSize("Use apenas o perfil indicado e não altere a senha nem o PIN. Guarde este recibo até ao fim do período.", W - 40),
    M,
    py + 4.5,
  )
  fonte("mono", 6.5, COR.claro)
  pdf.text(numeroRecibo(v), L - M, py, { align: "right" })
  pdf.text("ShopSync", L - M, py + 4, { align: "right" })

  return { blob: pdf.output("blob"), nome: nomeFicheiro(v) }
}

function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function baixarRecibo(v: Venda, conta: ContaServico | undefined) {
  await Promise.all([carregarPdf(), carregarFontes().catch(() => null)])
  const { blob, nome } = criarRecibo(v, conta)
  descarregar(blob, nome)
}

/**
 * No telemóvel abre a folha de partilha (onde aparece o WhatsApp).
 * No computador não é possível anexar ficheiros pelo link do WhatsApp,
 * por isso descarrega o PDF e devolve "descarregado".
 */
export async function partilharRecibo(
  v: Venda,
  conta: ContaServico | undefined,
  texto: string,
): Promise<"partilhado" | "descarregado" | "cancelado"> {
  // normalmente já está carregado desde a abertura da app, para a partilha ser imediata
  await carregarPdf()
  const { blob, nome } = criarRecibo(v, conta)
  const ficheiro = new File([blob], nome, { type: "application/pdf" })
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro], text: texto })
      return "partilhado"
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado"
    }
  }
  descarregar(blob, nome)
  return "descarregado"
}
