import { deleteField, doc, setDoc, updateDoc } from "firebase/firestore"
import { app, db } from "./firebase"

/*
  Notificações push com o site fechado (Firebase Cloud Messaging).
  Cada aparelho onde ativa as notificações recebe um "token", guardado em
  configuracoes/push. Um pequeno serviço no Cloudflare (pasta push-worker)
  lê as vendas todas as manhãs e envia o aviso para esses tokens.
*/

const VAPID = String(import.meta.env.VITE_FCM_VAPID_KEY || "").trim()
const CHAVE_LOCAL = "shopsync:push-token"

export const pushConfigurado = () => VAPID.length > 0

const chaveDoToken = (t: string) => `t_${t.replace(/[^a-zA-Z0-9]/g, "").slice(-28)}`

function nomeDoAparelho() {
  const ua = navigator.userAgent
  const so = /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iPhone" : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : "Outro"
  const nav = /edg\//i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Navegador"
  return `${nav} · ${so}`
}

/** Regista este aparelho para receber push. Devolve false se não for possível. */
export async function ativarPush(): Promise<boolean> {
  if (!pushConfigurado() || !("serviceWorker" in navigator)) return false
  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging")
    if (!(await isSupported())) return false
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"))
    await navigator.serviceWorker.ready
    const token = await getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: reg })
    if (!token) return false
    await setDoc(
      doc(db, "configuracoes", "push"),
      { tokens: { [chaveDoToken(token)]: { token, aparelho: nomeDoAparelho(), atualizado: new Date() } } },
      { merge: true },
    )
    try {
      localStorage.setItem(CHAVE_LOCAL, token)
    } catch {
      /* ignora */
    }
    return true
  } catch (e) {
    console.warn("Push não ativado", e)
    return false
  }
}

/** Deixa de enviar push para este aparelho. */
export async function desativarPush() {
  let token: string | null = null
  try {
    token = localStorage.getItem(CHAVE_LOCAL)
    localStorage.removeItem(CHAVE_LOCAL)
  } catch {
    /* ignora */
  }
  if (!token || !pushConfigurado()) return
  try {
    const { getMessaging, deleteToken } = await import("firebase/messaging")
    await deleteToken(getMessaging(app)).catch(() => null)
    await updateDoc(doc(db, "configuracoes", "push"), { [`tokens.${chaveDoToken(token)}`]: deleteField() })
  } catch (e) {
    console.warn("Não foi possível remover o token", e)
  }
}
