/*
  ShopSync · notificações push diárias.

  Todas as manhãs (ver wrangler.toml):
    1. lê no Firestore as subscrições que terminam hoje, amanhã ou nos próximos dias,
       e os pedidos pendentes;
    2. envia um resumo, por Firebase Cloud Messaging, para cada aparelho registado
       no painel (documento configuracoes/push);
    3. apaga os aparelhos que já não existem.

  Teste manual: abra  https://<o-seu-worker>.workers.dev/teste?chave=<CHAVE_TESTE>
*/

const DIA = 86_400_000
const DIAS_AVISO = 3

export default {
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(executar(env, { forcar: false }))
  },
  async fetch(pedido, env) {
    const url = new URL(pedido.url)
    if (url.pathname === "/teste") {
      if (!env.CHAVE_TESTE || url.searchParams.get("chave") !== env.CHAVE_TESTE) {
        return new Response("Chave errada.", { status: 403 })
      }
      try {
        return Response.json(await executar(env, { forcar: true }))
      } catch (e) {
        return Response.json({ erro: String(e?.message ?? e) }, { status: 500 })
      }
    }
    return new Response("ShopSync · serviço de notificações ativo.", { status: 200 })
  },
}

export async function executar(env, { forcar = false, agora = new Date() } = {}) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const projeto = env.PROJECT_ID || sa.project_id
  const fuso = Number(env.FUSO_HORAS ?? 2)
  const acesso = await obterAcesso(sa)
  const fs = firestore(projeto, acesso)

  // ---- 1. o que há para avisar ----
  const desde = new Date(agora.getTime() - DIA)
  const ate = new Date(agora.getTime() + (DIAS_AVISO + 1) * DIA)
  const proximas = (
    await fs.consultar({
      from: [{ collectionId: "vendas" }],
      where: {
        fieldFilter: { field: { fieldPath: "dataExpiracao" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: desde.toISOString() } },
      },
    })
  ).filter((v) => v.dataExpiracao && v.dataExpiracao < ate && v.status !== "renovado" && v.status !== "pendente")

  const pendentes = await fs.consultar({
    from: [{ collectionId: "vendas" }],
    where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pendente" } } },
  })

  const diaLocal = (d) => Math.floor((d.getTime() + fuso * 3600_000) / DIA)
  const hoje = diaLocal(agora)
  const conta = { hoje: 0, amanha: 0, depois: 0, ontem: 0 }
  const nomesHoje = []
  for (const v of proximas) {
    const d = diaLocal(v.dataExpiracao) - hoje
    if (d === 0) {
      conta.hoje++
      nomesHoje.push(v.nomeCliente)
    } else if (d === 1) conta.amanha++
    else if (d > 1 && d <= DIAS_AVISO) conta.depois++
    else if (d === -1) conta.ontem++
  }

  const mensagem = compor(conta, nomesHoje, pendentes.length)
  if (!mensagem && !forcar) return { enviado: false, motivo: "nada para avisar", conta, pendentes: pendentes.length }

  // ---- 2. enviar ----
  const docPush = await fs.ler("configuracoes/push")
  const tokens = Object.entries(docPush?.tokens ?? {})
    .map(([chave, t]) => ({ chave, token: t?.token }))
    .filter((t) => t.token)
  if (tokens.length === 0) return { enviado: false, motivo: "nenhum aparelho registado no painel", conta }

  const texto = mensagem ?? { titulo: "ShopSync · teste", corpo: "As notificações estão a funcionar." }
  const base = (env.PAINEL_URL || "").replace(/\/$/, "")
  const resultados = []
  for (const t of tokens) {
    const r = await enviarFcm(projeto, acesso, t.token, {
      title: texto.titulo,
      body: texto.corpo,
      url: `${base}/#/${conta.hoje + conta.amanha + conta.depois > 0 ? "vendas" : "painel"}`,
      tag: "resumo-diario",
    })
    resultados.push({ aparelho: t.chave, ok: r.ok, estado: r.estado })
    // ---- 3. limpar aparelhos que já não existem ----
    if (!r.ok && r.invalido) await fs.apagarCampo("configuracoes/push", `tokens.${t.chave}`)
  }
  return { enviado: true, conta, pendentes: pendentes.length, mensagem: texto, resultados }
}

export function compor(conta, nomesHoje, nPendentes) {
  const partes = []
  if (conta.hoje) partes.push(`${conta.hoje} ${conta.hoje === 1 ? "termina" : "terminam"} hoje`)
  if (conta.amanha) partes.push(`${conta.amanha} amanhã`)
  if (conta.depois) partes.push(`${conta.depois} nos próximos dias`)
  if (conta.ontem) partes.push(`${conta.ontem} ${conta.ontem === 1 ? "terminou" : "terminaram"} ontem`)
  if (partes.length === 0 && nPendentes === 0) return null

  let titulo
  if (conta.hoje === 1) titulo = `${nomesHoje[0]} termina hoje`
  else if (conta.hoje > 1) titulo = `${conta.hoje} clientes terminam hoje`
  else if (partes.length) titulo = "Renovações a tratar"
  else titulo = "Pedidos à espera"

  const juntar = (l) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`)
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
