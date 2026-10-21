// Service worker da ShopSync Gestão.
// Serve para mostrar notificações do sistema (o Android só as permite através de um service worker)
// e, numa fase seguinte, para receber notificações push mesmo com o site fechado.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

// Push (fase 2): quando um servidor enviar uma mensagem, mostra-a.
self.addEventListener("push", (e) => {
  let dados = { title: "ShopSync", body: "", url: "/#/painel" }
  try {
    const j = e.data.json()
    // mensagens do Firebase Cloud Messaging: { data: {...} } ou { notification: {...} }
    dados = { ...dados, ...(j.notification || {}), ...(j.data || {}), ...(j.data || j.notification ? {} : j) }
  } catch {
    if (e.data) dados.body = e.data.text()
  }
  e.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      tag: dados.tag || "shopsync",
      renotify: true,
      data: { url: dados.url },
    }),
  )
})

// Tocar na notificação abre (ou traz para a frente) o painel na página certa.
self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || "/#/painel"
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ("focus" in j) {
          j.navigate(url).catch(() => {})
          return j.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
