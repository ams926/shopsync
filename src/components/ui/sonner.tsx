import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

function useEcraGrande() {
  const [grande, setGrande] = useState(() => window.matchMedia("(min-width: 1024px)").matches)
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)")
    const f = () => setGrande(m.matches)
    m.addEventListener("change", f)
    return () => m.removeEventListener("change", f)
  }, [])
  return grande
}

function Toaster(props: ToasterProps) {
  const grande = useEcraGrande()
  return (
    <Sonner
      // telemóvel: em cima, longe da barra de navegação; computador: canto inferior direito
      position={grande ? "bottom-right" : "top-center"}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border-2 !border-ink !bg-paper-2 !text-ink !shadow-[3px_3px_0_0_var(--ink)] !font-sans !text-[14px]",
          title: "!font-bold",
          description: "!text-muted-foreground",
          actionButton: "!bg-ink !text-paper-2 !font-bold !rounded-md",
          success: "[&_[data-icon]]:!text-verde",
          error: "[&_[data-icon]]:!text-destructive",
          warning: "!bg-sol [&_[data-description]]:!text-ink/75",
          info: "[&_[data-icon]]:!text-roxo",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
