/*
  ShopSync · notificações push.

  O Cloudflare acorda este Worker de hora a hora (ver wrangler.toml) e ele faz duas coisas:

    A. Aviso de última hora (todas as horas, fora das horas de silêncio):
       quem termina daqui a cerca de 1 hora — por exemplo, às 13:00 avisa quem
       termina entre as 13:30 e as 14:30. Cada cliente é avisado uma só vez.

    B. Resumo do dia (uma vez, à HORA_RESUMO, por omissão 08:00 em Maputo):
       quem termina hoje, amanhã e nos próximos 3 dias, quem terminou ontem
       e os pedidos pendentes.

  Os avisos vão, por Firebase Cloud Messaging, para cada aparelho onde se
  ativou o sino no painel (documento configuracoes/push). Os aparelhos que já
  não existem são apagados dessa lista.

  Testes manuais (com a palavra-passe CHAVE_TESTE):
    https://<o-seu-worker>.workers.dev/teste?chave=...        → envia o resumo do dia agora
    https://<o-seu-worker>.workers.dev/teste-hora?chave=...   → envia o aviso da próxima hora agora
*/

const HORA = 3_600_000
const DIA = 24 * HORA
const DIAS_AVISO = 3

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(porHora(env, new Date(evento?.scheduledTime ?? Date.now())))
  },
  async fetch(pedido, env) {
    const url = new URL(pedido.url)
    const rotas = {
      "/teste": () => executar(env, { forcar: true }),
      "/teste-hora": () => avisosDaHora(env, { forcar: true }),
    }
    const rota = rotas[url.pathname]
    if (rota) {
      if (!env.CHAVE_TESTE || url.searchParams.get("chave") !== env.CHAVE_TESTE) {
        return new Response("Chave errada.", { status: 403 })
      }
      try {
        return Response.json(await rota())
      } catch (e) {
        return Response.json({ erro: String(e?.message ?? e) }, { status: 500 })
      }
    }
    return new Response("ShopSync · serviço de notificações ativo.", { status: 200 })
  },
}

// ---------------- o que corre de hora a hora ----------------

export async function porHora(env, agora = new Date()) {
  const c = await ligar(env)
  const r = {}
  if (horaLocal(agora, c.fuso) === Number(env.HORA_RESUMO ?? 8)) r.resumo = await executar(env, { agora, c })
  r.hora = await avisosDaHora(env, { agora, c })
  return r
}

async function ligar(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const projeto = env.PROJECT_ID || sa.project_id
  const fuso = Number(env.FUSO_HORAS ?? 2)
  const acesso = await obterAcesso(sa)
  return { projeto, fuso, acesso, fs: firestore(projeto, acesso) }
}

const horaLocal = (d, fuso) => new Date(d.getTime() + fuso * HORA).getUTCHours()
const hhmm = (d, fuso) => {
  const l = new Date(d.getTime() + fuso * HORA)
  return `${String(l.getUTCHours()).padStart(2, "0")}:${String(l.getUTCMinutes()).padStart(2, "0")}`
}
/** O site antigo guardava só o dia (meia-noite UTC): essas vendas não têm hora verdadeira. */
export const temHora = (d) => !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0)
const ativa = (v) => v.dataExpiracao && v.status !== "renovado" && v.status !== "pendente"

/** "22-7" = não incomodar das 22:00 às 07:00. Vazio = sem horas de silêncio. */
export function emSilencio(h, texto = "22-7") {
  const m = String(texto).match(/^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/)
  if (!m) return false
  const [ini, fim] = [Number(m[1]), Number(m[2])]
  if (ini === fim) return false
  return ini > fim ? h >= ini || h < fim : h >= ini && h < fim
}

const entre = (de, ate) => ({
  compositeFilter: {
    op: "AND",
    filters: [
      { fieldFilter: { field: { fieldPath: "dataExpiracao" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: de.toISOString() } } },
      { fieldFilter: { field: { fieldPath: "dataExpiracao" }, op: "LESS_THAN", value: { timestampValue: ate.toISOString() } } },
    ],
  },
})

const juntar = (l) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`)

// ---------------- A. aviso de última hora ----------------

export async function avisosDaHora(env, { agora = new Date(), forcar = false, c } = {}) {
  c ??= await ligar(env)
  const h = horaLocal(agora, c.fuso)
  if (!forcar && emSilencio(h, env.SILENCIO ?? "22-7")) return { enviado: false, motivo: "horas de silêncio" }

  // janela fixa por hora, para cada cliente cair numa só: [hora + 30 min, hora + 90 min)
  const t0 = Math.floor(agora.getTime() / HORA) * HORA
  const de = new Date(t0 + 30 * 60_000)
  const ate = new Date(t0 + 90 * 60_000)
  const lista = (await c.fs.consultar({ from: [{ collectionId: "vendas" }], where: entre(de, ate) }))
    .filter((v) => ativa(v) && temHora(v.dataExpiracao))
    .sort((a, b) => a.dataExpiracao - b.dataExpiracao)

  const mensagem = comporHora(lista, c.fuso)
  if (!mensagem && !forcar) return { enviado: false, motivo: "ninguém termina na próxima hora", janela: [hhmm(de, c.fuso), hhmm(ate, c.fuso)] }
  const texto = mensagem ?? {
    titulo: "ShopSync · teste (aviso de hora)",
    corpo: `Ninguém termina entre as ${hhmm(de, c.fuso)} e as ${hhmm(ate, c.fuso)}. Os avisos de hora estão a funcionar.`,
  }
  const envio = await enviarATodos(env, c, texto, "vendas", `hora-${t0}`)
  return { ...envio, janela: [hhmm(de, c.fuso), hhmm(ate, c.fuso)], clientes: lista.map((v) => v.nomeCliente), mensagem: texto }
}

export function comporHora(lista, fuso = 2) {
  if (lista.length === 0) return null
  if (lista.length === 1) {
    const v = lista[0]
    return {
      titulo: `ShopSync · ${v.nomeCliente} termina às ${hhmm(v.dataExpiracao, fuso)}`,
      corpo: `${v.servico || "Subscrição"}${v.perfil ? ` · perfil ${v.perfil}` : ""}. Toque para lembrar ou renovar.`,
    }
  }
  const nomes = lista.map((v) => v.nomeCliente)
  const mostrar = nomes.length > 3 ? [...nomes.slice(0, 3), `mais ${nomes.length - 3}`] : nomes
  return {
    titulo: `ShopSync · ${lista.length} clientes terminam até às ${hhmm(lista[lista.length - 1].dataExpiracao, fuso)}`,
    corpo: `${juntar(mostrar)}. Toque para lembrar ou renovar.`,
  }
}

// ---------------- B. resumo do dia ----------------

export async function executar(env, { forcar = false, agora = new Date(), c } = {}) {
  c ??= await ligar(env)
  const { fs, fuso } = c

  const proximas = (
    await fs.consultar({
      from: [{ collectionId: "vendas" }],
      where: entre(new Date(agora.getTime() - 2 * DIA), new Date(agora.getTime() + (DIAS_AVISO + 1) * DIA)),
    })
  ).filter(ativa)

  const pendentes = await fs.consultar({
    from: [{ collectionId: "vendas" }],
    where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pendente" } } },
  })

  const diaLocal = (d) => Math.floor((d.getTime() + fuso * HORA) / DIA)
  const hoje = diaLocal(agora)
  const conta = { hoje: 0, amanha: 0, depois: 0, ontem: 0 }
  const nomesHoje = []
  for (const v of proximas) {
    const d = diaLocal(v.dataExpiracao) - hoje
    // já terminou (ontem ou hoje de madrugada): conta como "terminou"
    if (v.dataExpiracao <= agora) {
      if (d >= -1) conta.ontem++
      continue
    }
    if (d === 0) {
      conta.hoje++
      nomesHoje.push({ nome: v.nomeCliente, hora: temHora(v.dataExpiracao) ? hhmm(v.dataExpiracao, fuso) : null })
    } else if (d === 1) conta.amanha++
    else if (d > 1 && d <= DIAS_AVISO) conta.depois++
    else if (d === -1) conta.ontem++
  }

  const mensagem = compor(conta, nomesHoje, pendentes.length)
  if (!mensagem && !forcar) return { enviado: false, motivo: "nada para avisar", conta, pendentes: pendentes.length }
  const texto = mensagem ?? { titulo: "ShopSync · teste", corpo: "As notificações estão a funcionar." }
  const caminho = conta.hoje + conta.amanha + conta.depois > 0 ? "vendas" : "painel"
  const envio = await enviarATodos(env, c, texto, caminho, "resumo-diario")
  return { ...envio, conta, pendentes: pendentes.length, mensagem: texto }
}

// ---------------- envio para todos os aparelhos ----------------

async function enviarATodos(env, c, texto, caminho, tag) {
  const docPush = await c.fs.ler("configuracoes/push")
  const tokens = Object.entries(docPush?.tokens ?? {})
    .map(([chave, t]) => ({ chave, token: t?.token }))
    .filter((t) => t.token)
  if (tokens.length === 0) return { enviado: false, motivo: "nenhum aparelho registado no painel" }

  const base = (env.PAINEL_URL || "").replace(/\/$/, "")
  const resultados = []
  for (const t of tokens) {
    const r = await enviarFcm(c.projeto, c.acesso, t.token, { title: texto.titulo, body: texto.corpo, url: `${base}/#/${caminho}`, tag })
    resultados.push({ aparelho: t.chave, ok: r.ok, estado: r.estado })
    // aparelhos que já não existem saem da lista
    if (!r.ok && r.invalido) await c.fs.apagarCampo("configuracoes/push", `tokens.${t.chave}`)
  }
  return { enviado: resultados.some((r) => r.ok), resultados }
}

export function compor(conta, nomesHoje, nPendentes) {
  const partes = []
  if (conta.hoje) partes.push(`${conta.hoje} ${conta.hoje === 1 ? "termina" : "terminam"} hoje`)
  if (conta.amanha) partes.push(`${conta.amanha} amanhã`)
  if (conta.depois) partes.push(`${conta.depois} nos próximos dias`)
  if (conta.ontem) partes.push(`${conta.ontem} ${conta.ontem === 1 ? "terminou" : "terminaram"} desde ontem`)
  if (partes.length === 0 && nPendentes === 0) return null

  let titulo
  if (conta.hoje === 1) {
    const n = typeof nomesHoje[0] === "string" ? { nome: nomesHoje[0] } : nomesHoje[0]
    titulo = `${n.nome} termina hoje${n.hora ? ` às ${n.hora}` : ""}`
  }
  else if (conta.hoje > 1) titulo = `${conta.hoje} clientes terminam hoje`
  else if (partes.length) titulo = "Renovações a tratar"
  else titulo = "Pedidos à espera"

  let corpo = partes.length ? `${juntar(partes)}.` : ""
  if (nPendentes) corpo += `${corpo ? " " : ""}${nPendentes} ${nPendentes === 1 ? "pedido pendente" : "pedidos pendentes"}.`
  return { titulo: `ShopSync · ${titulo}`, corpo: `${corpo} Toque para abrir o painel.` }
}

// ---------------- Google: autenticação com a conta de serviço ----------------

const b64url = (dados) => {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : new Uint8Array(dados)
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function pemParaDer(pem) {
  const b = atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""))
  const u = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i)
  return u.buffer
}

export async function obterAcesso(sa, fetchFn = fetch) {
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const corpo = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600,
    }),
  )
  const chave = await crypto.subtle.importKey("pkcs8", pemParaDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
  const assinatura = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(`${cabecalho}.${corpo}`))
  const r = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecalho}.${corpo}.${b64url(assinatura)}`,
    }),
  })
  if (!r.ok) throw new Error(`Google recusou a conta de serviço (${r.status}): ${await r.text()}`)
  return (await r.json()).access_token
}

// ---------------- Firestore (API REST) ----------------

/** Converte um valor do Firestore REST para JavaScript simples. */
export function valor(v) {
  if (!v) return null
  if ("stringValue" in v) return v.stringValue
  if ("integerValue" in v) return Number(v.integerValue)
  if ("doubleValue" in v) return v.doubleValue
  if ("booleanValue" in v) return v.booleanValue
  if ("timestampValue" in v) return new Date(v.timestampValue)
  if ("nullValue" in v) return null
  if ("mapValue" in v) return campos(v.mapValue.fields ?? {})
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(valor)
  return null
}
const campos = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, valor(v)]))

export function firestore(projeto, acesso, fetchFn = fetch) {
  const base = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents`
  const h = { authorization: `Bearer ${acesso}`, "content-type": "application/json" }
  return {
    async consultar(structuredQuery) {
      const r = await fetchFn(`${base}:runQuery`, { method: "POST", headers: h, body: JSON.stringify({ structuredQuery }) })
      if (!r.ok) throw new Error(`Firestore: ${r.status} ${await r.text()}`)
      return (await r.json()).filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").pop(), ...campos(x.document.fields ?? {}) }))
    },
    async ler(caminho) {
      const r = await fetchFn(`${base}/${caminho}`, { headers: h })
      if (r.status === 404) return null
      if (!r.ok) throw new Error(`Firestore: ${r.status} ${await r.text()}`)
      return campos((await r.json()).fields ?? {})
    },
    async apagarCampo(caminho, campo) {
      // updateMask com o campo e sem o enviar = apagar esse campo
      await fetchFn(`${base}/${caminho}?updateMask.fieldPaths=${encodeURIComponent(campo)}`, {
        method: "PATCH",
        headers: h,
        body: JSON.stringify({ fields: {} }),
      })
    },
  }
}

// ---------------- Firebase Cloud Messaging ----------------

export async function enviarFcm(projeto, acesso, token, dados, fetchFn = fetch) {
  const r = await fetchFn(`https://fcm.googleapis.com/v1/projects/${projeto}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${acesso}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        data: Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, String(v)])),
        webpush: { headers: { Urgency: "high", TTL: "43200" } },
      },
    }),
  })
  if (r.ok) return { ok: true, estado: r.status }
  const texto = await r.text()
  const invalido = r.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(texto)
  return { ok: false, estado: r.status, invalido }
}
