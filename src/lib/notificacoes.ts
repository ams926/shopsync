/*
  Notificações do sistema (as que aparecem fora do navegador).
  Nesta fase funcionam enquanto o painel estiver aberto — mesmo minimizado
  ou noutro separador. Para chegarem com o site fechado é preciso um pequeno
  servidor que as envie (ver README, "Notificações push").
*/

const CHAVE_ATIVAS = "shopsync:notificacoes"

export const suportaNotificacoes = () => typeof window !== "undefined" && "Notification" in window

export function permissao(): NotificationPermission | "indisponivel" {
  return suportaNotificacoes() ? Notification.permission : "indisponivel"
}

export function notificacoesAtivas(): boolean {
  try {
    return permissao() === "granted" && localStorage.getItem(CHAVE_ATIVAS) !== "0"
  } catch {
    return permissao() === "granted"
  }
}

export function definirAtivas(ativas: boolean) {
  try {
    localStorage.setItem(CHAVE_ATIVAS, ativas ? "1" : "0")
  } catch {
    /* sem armazenamento: fica só nesta sessão */
  }
}

export async function pedirPermissao(): Promise<boolean> {
  if (!suportaNotificacoes()) return false
  const r = await Notification.requestPermission()
  if (r === "granted") definirAtivas(true)
  return r === "granted"
}

export async function registarServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  try {
    await navigator.serviceWorker.register("/sw.js")
  } catch (e) {
    console.warn("Service worker não registado", e)
  }
}

export async function notificar(titulo: string, corpo: string, url = "/#/painel", etiqueta?: string) {
  if (!notificacoesAtivas()) return
  const opcoes: NotificationOptions = {
    body: corpo,
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    tag: etiqueta,
    data: { url },
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(titulo, opcoes)
      return
    }
    new Notification(titulo, opcoes)
  } catch (e) {
    console.warn("Notificação falhou", e)
  }
}

/** Para mostrar o resumo diário só uma vez por dia. */
export function jaAvisouHoje(chave: string): boolean {
  const hoje = new Date().toDateString()
  try {
    if (localStorage.getItem(`shopsync:${chave}`) === hoje) return true
    localStorage.setItem(`shopsync:${chave}`, hoje)
  } catch {
    /* ignora */
  }
  return false
}
