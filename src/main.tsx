import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/bricolage-grotesque/opsz.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "@fontsource/ibm-plex-mono/600.css"
import "./index.css"
import App from "./App"
import { registarServiceWorker } from "./lib/notificacoes"

if (import.meta.env.PROD) void registarServiceWorker()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
