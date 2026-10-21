import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // modo de demonstração (só para testes locais): troca o Firebase por dados de exemplo
      ...(mode === "demo"
        ? {
            "firebase/app": path.resolve(__dirname, "./demo/firebase-app.ts"),
            "firebase/auth": path.resolve(__dirname, "./demo/firebase-auth.ts"),
            "firebase/firestore": path.resolve(__dirname, "./demo/firebase-firestore.ts"),
            "firebase/messaging": path.resolve(__dirname, "./demo/firebase-messaging.ts"),
          }
        : {}),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase")) return "firebase"
          if (id.includes("node_modules/jspdf") || id.includes("html2canvas") || id.includes("dompurify")) return "pdf"
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-vendor")) return "graficos"
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) return "react"
          if (id.includes("node_modules/@radix-ui") || id.includes("node_modules/radix-ui")) return "ui"
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
}))
